import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  acceptTerms,
  canStartVerify,
  changeCamera,
  completeOnboarding,
  continueEnabled,
  DEFAULT_ONBOARDING_STATE,
  looksLikeHtmlOrCaptivePortal,
  needsTermsAcceptance,
  parseOnboardingState,
  resolveInitialStep,
  scheduleOneShotVerify,
  shouldRunAppStateVerify,
  skipCameraSetup,
  TERMS_VERSION,
  VERIFY_IN_PROGRESS,
  __resetVerifyGateForTests,
  classifyVerifyError,
  CONNECTION_METHOD_ENABLED,
  CAMERA_PROFILES,
  canStartConnection,
  LEGAL_DRAFT_BANNER,
  NOTIFICATIONS_ONBOARDING_POLICY,
  PHOTOS_PERMISSION_ONBOARDING_POLICY,
  userFacingConnectionError,
  shouldAllowGateBypassSegment,
} from "./index";
import { ensureAddOnlyPhotosPermission } from "./mediaPermissions";
import { verifyCameraConnection } from "./verifyCamera";
import type { Transport, TransportResponse } from "../../packages/camera-transport/src/index";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("onboardingMachine", () => {
  it("fresh install resolves to terms", () => {
    assert.equal(resolveInitialStep(DEFAULT_ONBOARDING_STATE), "terms");
    assert.equal(needsTermsAcceptance(DEFAULT_ONBOARDING_STATE), true);
  });

  it("Continue stays disabled until terms agreed", () => {
    assert.equal(continueEnabled(false), false);
    assert.equal(continueEnabled(true), true);
  });

  it("accepting terms moves to camera setup", () => {
    const next = acceptTerms(DEFAULT_ONBOARDING_STATE, "2026-07-20T12:00:00.000Z");
    assert.equal(next.acceptedTermsVersion, TERMS_VERSION);
    assert.equal(next.acceptedTermsAt, "2026-07-20T12:00:00.000Z");
    assert.equal(resolveInitialStep(next), "cameraSetup");
  });

  it("new terms version forces terms again", () => {
    const accepted = acceptTerms(DEFAULT_ONBOARDING_STATE, "2026-07-20T12:00:00.000Z");
    const stale = { ...accepted, acceptedTermsVersion: "0.0-old" };
    assert.equal(needsTermsAcceptance(stale), true);
    assert.equal(resolveInitialStep(stale), "terms");
  });

  it("resumes mid-flow at a safe step", () => {
    const mid = {
      ...acceptTerms(DEFAULT_ONBOARDING_STATE, "2026-07-20T12:00:00.000Z"),
      resumeStep: "connecting" as const,
      selectedCameraProfileId: "mivue-866",
    };
    assert.equal(resolveInitialStep(mid), "connectionGuide");
  });

  it("skip camera setup completes onboarding without camera", () => {
    const afterTerms = acceptTerms(DEFAULT_ONBOARDING_STATE, "2026-07-20T12:00:00.000Z");
    const skipped = skipCameraSetup(afterTerms);
    assert.equal(skipped.onboardingCompleted, true);
    assert.equal(skipped.cameraSetupCompleted, false);
    assert.equal(resolveInitialStep(skipped), "completed");
  });

  it("Open Library marks both completion flags", () => {
    const done = completeOnboarding({
      ...acceptTerms(DEFAULT_ONBOARDING_STATE, "2026-07-20T12:00:00.000Z"),
      selectedCameraProfileId: "mivue-866",
      resumeStep: "success",
    });
    assert.equal(done.onboardingCompleted, true);
    assert.equal(done.cameraSetupCompleted, true);
    assert.equal(resolveInitialStep(done), "completed");
  });

  it("change camera keeps terms and does not imply local file wipe", () => {
    const base = completeOnboarding({
      ...acceptTerms(DEFAULT_ONBOARDING_STATE, "2026-07-20T12:00:00.000Z"),
      selectedCameraProfileId: "mivue-866",
    });
    const changed = changeCamera(base);
    assert.equal(changed.acceptedTermsVersion, TERMS_VERSION);
    assert.equal(changed.selectedCameraProfileId, undefined);
    assert.equal(changed.cameraSetupCompleted, false);
    // Contract: changeCamera only mutates onboarding fields — local media is out of scope.
    assert.ok(!("localFiles" in changed));
  });
});

describe("onboardingStore parse", () => {
  it("recovers from corrupt payloads", () => {
    assert.deepEqual(parseOnboardingState(null), DEFAULT_ONBOARDING_STATE);
    assert.deepEqual(parseOnboardingState("nope"), DEFAULT_ONBOARDING_STATE);
    const parsed = parseOnboardingState({
      schemaVersion: 1,
      onboardingCompleted: true,
      cameraSetupCompleted: true,
      acceptedTermsVersion: TERMS_VERSION,
      resumeStep: "connecting",
    });
    assert.equal(parsed.resumeStep, "connectionGuide");
  });
});

describe("verifyCamera", () => {
  it("rejects HTML / captive portal bodies", () => {
    assert.equal(looksLikeHtmlOrCaptivePortal("<!DOCTYPE html><html>"), true);
    assert.equal(looksLikeHtmlOrCaptivePortal("0\nOK\nstatus=\n"), false);
  });

  it("prevents concurrent checks", () => {
    assert.equal(canStartVerify(false), true);
    assert.equal(canStartVerify(true), false);
    assert.match(VERIFY_IN_PROGRESS, /already in progress/i);
  });

  it("classifies timeout and permission errors", () => {
    assert.equal(classifyVerifyError("timeout waiting"), "timedOut");
    assert.equal(classifyVerifyError("Local network permission denied"), "permissionDenied");
  });

  it("valid status response yields success", async () => {
    __resetVerifyGateForTests();
    const transport: Transport = {
      async request(): Promise<TransportResponse> {
        return {
          statusCode: 200,
          headers: { server: "AIT Multimedia Network Solution" },
          body: Buffer.from("0\r\nOK\r\nCamera.Menu.UIMode=1\r\n", "utf8"),
        };
      },
    };
    const profile = CAMERA_PROFILES[0]!;
    const result = await verifyCameraConnection({
      host: "192.72.1.1",
      profile,
      deps: {
        createTransport: () => transport,
        timeoutMs: 1000,
      },
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.host, "192.72.1.1");
  });

  it("rejects HTML transport body as invalid camera", async () => {
    __resetVerifyGateForTests();
    const transport: Transport = {
      async request(): Promise<TransportResponse> {
        return {
          statusCode: 200,
          headers: { "content-type": "text/html" },
          body: Buffer.from("<!DOCTYPE html><html><body>Login</body></html>", "utf8"),
        };
      },
    };
    const result = await verifyCameraConnection({
      host: "192.72.1.1",
      profile: CAMERA_PROFILES[0]!,
      deps: { createTransport: () => transport },
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.state, "invalidCameraResponse");
  });
});

describe("appStateVerify", () => {
  it("runs one-shot only when idle and not inflight", () => {
    assert.equal(
      shouldRunAppStateVerify({ enabled: true, verifyState: "idle", inflight: false }),
      true,
    );
    assert.equal(
      shouldRunAppStateVerify({ enabled: true, verifyState: "checking", inflight: false }),
      false,
    );
    assert.equal(
      shouldRunAppStateVerify({ enabled: true, verifyState: "idle", inflight: true }),
      false,
    );
  });

  it("scheduleOneShotVerify fires once and can cancel", async () => {
    let count = 0;
    const cancel = scheduleOneShotVerify(() => {
      count += 1;
    }, 20);
    cancel();
    await new Promise((r) => setTimeout(r, 40));
    assert.equal(count, 0);

    let fired = 0;
    scheduleOneShotVerify(() => {
      fired += 1;
    }, 15);
    await new Promise((r) => setTimeout(r, 40));
    assert.equal(fired, 1);
  });
});

describe("connection capabilities", () => {
  it("hides qr and bluetooth until implemented", () => {
    assert.equal(CONNECTION_METHOD_ENABLED.wifi, true);
    assert.equal(CONNECTION_METHOD_ENABLED.qr, false);
    assert.equal(CONNECTION_METHOD_ENABLED.bluetooth, false);
    assert.equal(canStartConnection(CAMERA_PROFILES[0]!), true);
  });
});

describe("permissions policy", () => {
  it("does not request notifications in onboarding", () => {
    assert.equal(NOTIFICATIONS_ONBOARDING_POLICY, "never_in_onboarding");
  });

  it("photos helper is unavailable and not for startup", async () => {
    assert.equal(PHOTOS_PERMISSION_ONBOARDING_POLICY, "never_at_startup_or_onboarding");
    const result = await ensureAddOnlyPhotosPermission();
    assert.equal(result.status, "unavailable");
  });

  it("onboarding screens do not import mediaPermissions or notifications", () => {
    const dir = join(__dirname, "../../app/onboarding");
    for (const file of [
      "terms.tsx",
      "add-camera.tsx",
      "select-camera.tsx",
      "connect.tsx",
      "success.tsx",
      "index.tsx",
      "_layout.tsx",
    ]) {
      const src = readFileSync(join(dir, file), "utf8");
      assert.equal(src.includes("mediaPermissions"), false, file);
      assert.equal(src.includes("Notifications"), false, file);
      assert.equal(src.includes("expo-notifications"), false, file);
      assert.equal(src.includes("MediaLibrary"), false, file);
    }
    const provider = readFileSync(join(__dirname, "OnboardingProvider.tsx"), "utf8");
    assert.equal(provider.includes("mediaPermissions"), false);
    assert.equal(provider.includes("expo-notifications"), false);
  });
});

describe("legal draft", () => {
  it("marks draft legal review required once", () => {
    assert.match(LEGAL_DRAFT_BANNER, /DRAFT/i);
    assert.match(LEGAL_DRAFT_BANNER, /Legal review/i);
  });
});

describe("connectionErrors", () => {
  it("maps timeout to Camera not found", () => {
    const e = userFacingConnectionError("timedOut", "FetchTransport timed out after 12000ms");
    assert.equal(e.title, "Camera not found");
    assert.doesNotMatch(e.message, /FetchTransport|HTTP\/1\.0|Expo Go/i);
  });

  it("maps permission denied to Settings guidance", () => {
    const e = userFacingConnectionError("permissionDenied");
    assert.match(e.title, /Local network/i);
    assert.match(e.message, /Settings/i);
  });

  it("allows connection-help while onboarding gate is active", () => {
    assert.equal(shouldAllowGateBypassSegment("connection-help"), true);
    assert.equal(shouldAllowGateBypassSegment("legal-document"), true);
    assert.equal(shouldAllowGateBypassSegment("onboarding"), true);
    assert.equal(shouldAllowGateBypassSegment("(tabs)"), false);
  });
});

describe("appStateVerify focus contract", () => {
  it("does not recommend verify while checking or when disabled", () => {
    assert.equal(
      shouldRunAppStateVerify({ enabled: false, verifyState: "idle", inflight: false }),
      false,
    );
  });
});

describe("onboarding layout contract", () => {
  it("screens avoid space-between footers and sticky absolute CTAs", () => {
    const dir = join(__dirname, "../../app/onboarding");
    for (const file of ["terms.tsx", "add-camera.tsx", "select-camera.tsx", "connect.tsx", "success.tsx"]) {
      const src = readFileSync(join(dir, file), "utf8");
      assert.equal(src.includes('justifyContent: "space-between"'), false, file);
      assert.equal(src.includes("position: \"absolute\""), false, file);
    }
    const ui = readFileSync(join(__dirname, "OnboardingUi.tsx"), "utf8");
    assert.match(ui, /ScrollView/);
    assert.match(ui, /SettingsChromeHeader/);
    assert.equal(ui.includes('justifyContent: "space-between"'), false);
    const chrome = readFileSync(join(__dirname, "OnboardingScreenChrome.tsx"), "utf8");
    assert.match(chrome, /SettingsChromeHeader/);
  });

  it("Open Library uses navigation reset not only replace", () => {
    const src = readFileSync(join(__dirname, "../../app/onboarding/success.tsx"), "utf8");
    assert.match(src, /CommonActions\.reset/);
  });

  it("success exit always refreshes camera link before tabs", () => {
    const src = readFileSync(join(__dirname, "../../app/onboarding/success.tsx"), "utf8");
    assert.match(src, /await refreshFiles\(\)/);
    assert.equal(src.includes('if (href === "/(tabs)")'), false);
  });
});
