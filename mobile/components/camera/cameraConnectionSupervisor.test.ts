import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  ACTIVE_POLL_INTERVAL_MS,
  CAMERA_HEALTH_TIMEOUT_MS,
  FOREGROUND_VERIFY_DEBOUNCE_MS,
  MAX_VERIFY_FAILURES_BEFORE_CLEAR,
  VERIFY_SKIP_IF_RECENT_MS,
  __resetReachabilityGateForTests,
  isAppForegroundResume,
  isBusyForHealthCheck,
  isCameraLikeStatusResponse,
  linkStateAfterVerifyFailure,
  nextReconnectBackoffMs,
  shouldClearLibraryAfterFailures,
  shouldRunActiveHealthPoll,
  shouldRunDisconnectedReconnect,
  shouldSkipVerifyBecauseRecent,
  verifyCameraReachability,
} from "./cameraConnectionSupervisor";

const __dirname = dirname(fileURLToPath(import.meta.url));
const contextSrc = readFileSync(join(__dirname, "../../context/DemoModeContext.tsx"), "utf8");

describe("cameraConnectionSupervisor helpers", () => {
  it("detects foreground resume and skips recent success", () => {
    assert.equal(isAppForegroundResume("background", "active"), true);
    assert.equal(isAppForegroundResume("inactive", "active"), true);
    assert.equal(isAppForegroundResume("active", "active"), false);
    assert.equal(isAppForegroundResume("active", "background"), false);
    assert.equal(shouldSkipVerifyBecauseRecent(1_000, 1_000 + VERIFY_SKIP_IF_RECENT_MS - 1), true);
    assert.equal(shouldSkipVerifyBecauseRecent(1_000, 1_000 + VERIFY_SKIP_IF_RECENT_MS), false);
    assert.equal(shouldSkipVerifyBecauseRecent(undefined, 5_000), false);
  });

  it("escalates failures: unstable then clear", () => {
    assert.equal(linkStateAfterVerifyFailure(1), "unstable");
    assert.equal(shouldClearLibraryAfterFailures(1), false);
    assert.equal(linkStateAfterVerifyFailure(MAX_VERIFY_FAILURES_BEFORE_CLEAR), "connection_lost");
    assert.equal(shouldClearLibraryAfterFailures(2), true);
  });

  it("reconnect backoff is 2s→5s→10s→20s→30s", () => {
    assert.deepEqual(
      [0, 1, 2, 3, 4, 5].map((i) => nextReconnectBackoffMs(i)),
      [2_000, 5_000, 10_000, 20_000, 30_000, 30_000],
    );
  });

  it("polls only while active and linked; reconnect only when disconnected", () => {
    assert.equal(
      shouldRunActiveHealthPoll({ appState: "active", demoMode: false, linkState: "connected" }),
      true,
    );
    assert.equal(
      shouldRunActiveHealthPoll({ appState: "active", demoMode: false, linkState: "unstable" }),
      true,
    );
    assert.equal(
      shouldRunActiveHealthPoll({ appState: "background", demoMode: false, linkState: "connected" }),
      false,
    );
    assert.equal(
      shouldRunActiveHealthPoll({ appState: "active", demoMode: true, linkState: "connected" }),
      false,
    );
    assert.equal(
      shouldRunDisconnectedReconnect({
        appState: "active",
        demoMode: false,
        linkState: "disconnected",
      }),
      true,
    );
    assert.equal(
      shouldRunDisconnectedReconnect({
        appState: "active",
        demoMode: false,
        linkState: "connected",
      }),
      false,
    );
  });

  it("busy gate covers verify/refresh/mutate/download", () => {
    assert.equal(
      isBusyForHealthCheck({
        verifyInflight: false,
        refreshInflight: false,
        settingApplyInflight: false,
        hasActiveDownload: false,
      }),
      false,
    );
    assert.equal(
      isBusyForHealthCheck({
        verifyInflight: true,
        refreshInflight: false,
        settingApplyInflight: false,
        hasActiveDownload: false,
      }),
      true,
    );
    assert.equal(
      isBusyForHealthCheck({
        verifyInflight: false,
        refreshInflight: false,
        settingApplyInflight: false,
        hasActiveDownload: true,
      }),
      true,
    );
  });

  it("accepts empty status OK and rejects HTML", () => {
    assert.equal(
      isCameraLikeStatusResponse({
        raw: "0\nOK\nstatus=\n",
        properties: { status: "" },
        code: 0,
        message: "OK",
      }),
      true,
    );
    assert.equal(
      isCameraLikeStatusResponse({
        raw: "<!doctype html><html><title>Login</title>",
        properties: {},
        code: 0,
        message: "OK",
      }),
      false,
    );
  });

  it("health check uses short timeout constants", () => {
    assert.ok(CAMERA_HEALTH_TIMEOUT_MS >= 2_000 && CAMERA_HEALTH_TIMEOUT_MS <= 3_000);
    assert.ok(FOREGROUND_VERIFY_DEBOUNCE_MS >= 800 && FOREGROUND_VERIFY_DEBOUNCE_MS <= 1_200);
    assert.ok(ACTIVE_POLL_INTERVAL_MS >= 10_000 && ACTIVE_POLL_INTERVAL_MS <= 15_000);
  });
});

describe("verifyCameraReachability", () => {
  it("is single-flight and does not list files or settings", async () => {
    __resetReachabilityGateForTests();
    const paths: string[] = [];
    const transport = {
      request: async (req: { readonly path: string }) => {
        paths.push(req.path);
        await new Promise((r) => setTimeout(r, 30));
        return {
          statusCode: 200,
          headers: {},
          body: new TextEncoder().encode("0\nOK\nstatus=\n"),
        };
      },
    };
    const createTransport = () => transport as never;
    const first = verifyCameraReachability({
      host: "192.72.1.1",
      deps: { createTransport, timeoutMs: 500 },
    });
    const second = await verifyCameraReachability({
      host: "192.72.1.1",
      deps: { createTransport, timeoutMs: 500 },
    });
    assert.equal(second.ok, false);
    if (!second.ok) assert.match(second.error, /already in progress/i);
    const ok = await first;
    assert.equal(ok.ok, true);
    assert.equal(paths.length, 1);
    assert.match(paths[0]!, /action=get/);
    assert.match(paths[0]!, /property=status/);
    assert.doesNotMatch(paths[0]!, /Normal|Event|list|File/);
    __resetReachabilityGateForTests();
  });
});

describe("DemoModeContext supervisor wiring", () => {
  it("foreground resume does not clear then full-refresh", () => {
    const appStateBlock = contextSrc.slice(
      contextSrc.indexOf("const onChange = (next: AppStateStatus)"),
      contextSrc.indexOf("const sub = AppState.addEventListener"),
    );
    assert.doesNotMatch(
      appStateBlock,
      /clearRemoteCameraLibrary\("disconnected"\)\s*;\s*\n\s*if \(refreshInflightRef/,
    );
    assert.match(contextSrc, /verifyCameraReachability/);
    assert.match(contextSrc, /FOREGROUND_VERIFY_DEBOUNCE_MS|scheduleOneShotVerify/);
    assert.doesNotMatch(
      contextSrc,
      /scheduleOneShotVerify\(\(\) => \{\s*void refreshFilesRef\.current\(\)/,
    );
    assert.match(
      appStateBlock,
      /shouldRunActiveHealthPoll[\s\S]*linkState:\s*linkStateRef\.current/,
    );
    assert.match(
      appStateBlock,
      /next !== "active"[\s\S]*queue\.setConnectionAvailable\(false\)/,
    );
    assert.match(
      appStateBlock,
      /queueCanResume[\s\S]*queue\.setConnectionAvailable\(queueCanResume\)/,
    );
    assert.match(contextSrc, /createdQueue\.setConnectionAvailable\(false\)/);
  });

  it("keeps full refreshFiles for bootstrap/manual/reconnect paths", () => {
    assert.match(contextSrc, /listAllFiles/);
    assert.match(contextSrc, /fetchCameraSettingProperties/);
    assert.match(contextSrc, /setCameraLinkState\("connecting"\)/);
  });

  it("health check path does not call listAllFiles or fetchCameraSettingProperties", () => {
    const verifyFn = contextSrc.slice(
      contextSrc.indexOf("verifyCameraReachability"),
      contextSrc.indexOf("verifyCameraReachability") + 800,
    );
    // The import/call site for health check must not be the refreshFiles body.
    const healthBlock = contextSrc.slice(
      contextSrc.indexOf("const runSilentHealthCheck"),
      contextSrc.indexOf("const runSilentHealthCheck") + 2_500,
    );
    assert.match(healthBlock, /verifyCameraReachability/);
    assert.doesNotMatch(healthBlock, /listAllFiles/);
    assert.doesNotMatch(healthBlock, /fetchCameraSettingProperties/);
    assert.doesNotMatch(healthBlock, /setIsRefreshingCamera\(true\)/);
    assert.doesNotMatch(healthBlock, /setCameraLinkState\("connecting"\)/);
    assert.match(healthBlock, /appStateRef\.current !== "active"/);
    void verifyFn;
  });

  it("does not treat an active queue row as proof of camera health", () => {
    const healthBlock = contextSrc.slice(
      contextSrc.indexOf("const runSilentHealthCheck"),
      contextSrc.indexOf("const runSilentHealthCheck") + 1_600,
    );
    const busyBlock = healthBlock.slice(
      healthBlock.indexOf("if (\n      isBusyForHealthCheck"),
      healthBlock.indexOf("if (shouldSkipVerifyBecauseRecent"),
    );
    assert.match(busyBlock, /active queue row is not proof of live progress/);
    assert.doesNotMatch(busyBlock, /lastVerifiedAtRef\.current\s*=/);
    assert.doesNotMatch(busyBlock, /consecutiveVerifyFailuresRef\.current\s*=\s*0/);
    assert.doesNotMatch(busyBlock, /setCameraLinkState\("connected"\)/);
  });

  it("arms the fast second verify from unstable state after effect resubscription", () => {
    const supervisorEffect = contextSrc.slice(
      contextSrc.indexOf("const armDisconnectedReconnect"),
      contextSrc.indexOf("const sub = AppState.addEventListener"),
    );
    assert.match(
      supervisorEffect,
      /linkStateRef\.current === "unstable"[\s\S]*armUnstableRetry\(\)/,
    );
    assert.match(
      supervisorEffect,
      /armUnstableRetry[\s\S]*VERIFY_RETRY_AFTER_FIRST_FAILURE_MS/,
    );
  });

  it("Demo Mode does not start live polling", () => {
    assert.match(contextSrc, /shouldRunActiveHealthPoll/);
    assert.match(contextSrc, /demoMode/);
    assert.match(contextSrc, /ACTIVE_POLL_INTERVAL_MS/);
  });

  it("clears library only after consecutive verified failures", () => {
    assert.match(contextSrc, /shouldClearLibraryAfterFailures|MAX_VERIFY_FAILURES_BEFORE_CLEAR/);
    assert.match(contextSrc, /consecutiveVerifyFailures/);
  });
});
