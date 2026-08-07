import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { areInternalToolsEnabled } from "../environment/buildEnvironment";
import {
  LEGAL_DRAFT_BANNER,
  LEGAL_PLACEHOLDERS,
  PRIVACY_POLICY_DOCUMENT,
  TERMS_CHECKBOX_LABEL,
  TERMS_OF_USE_DOCUMENT,
  TERMS_VERSION,
  needsTermsAcceptance,
  acceptTerms,
  DEFAULT_ONBOARDING_STATE,
} from "./index";

function sectionTitles(doc: { sections: readonly { title: string }[] }): string[] {
  return doc.sections.map((s) => s.title);
}

describe("legal documents draft", () => {
  it("keeps draft banner and status", () => {
    assert.match(LEGAL_DRAFT_BANNER, /DRAFT/);
    assert.match(LEGAL_DRAFT_BANNER, /Legal review required/);
    assert.equal(TERMS_OF_USE_DOCUMENT.status, "draft");
    assert.equal(PRIVACY_POLICY_DOCUMENT.status, "draft");
    assert.doesNotMatch(JSON.stringify(TERMS_OF_USE_DOCUMENT), /\bapproved\b/i);
    assert.doesNotMatch(JSON.stringify(PRIVACY_POLICY_DOCUMENT), /\bapproved\b/i);
    assert.doesNotMatch(JSON.stringify(TERMS_OF_USE_DOCUMENT), /legally compliant/i);
    assert.doesNotMatch(JSON.stringify(PRIVACY_POLICY_DOCUMENT), /legally compliant/i);
  });

  it("Terms includes all required sections", () => {
    const titles = sectionTitles(TERMS_OF_USE_DOCUMENT);
    assert.equal(titles.length, 17);
    assert.match(titles[0]!, /About these Terms/i);
    assert.match(titles[5]!, /Camera access/i);
    assert.match(titles[8]!, /Online maps/i);
    assert.match(titles[9]!, /Compatibility/i);
    assert.match(titles[16]!, /Contact/i);
    const flat = JSON.stringify(TERMS_OF_USE_DOCUMENT);
    assert.match(flat, /GET\/HEAD|GET and HEAD/i);
    assert.match(flat, /not affiliated with Mio or MiTAC/i);
    assert.match(flat, /OpenStreetMap/i);
    assert.match(flat, /\[GOVERNING LAW\]/);
    assert.match(flat, /\[LEGAL ENTITY NAME\]/);
  });

  it("Privacy includes all required sections and third parties", () => {
    const titles = sectionTitles(PRIVACY_POLICY_DOCUMENT);
    assert.equal(titles.length, 19);
    assert.match(titles[5]!, /Online map/i);
    assert.match(titles[6]!, /Expo\/EAS Updates/i);
    assert.match(titles[9]!, /Diagnostics/i);
    const flat = JSON.stringify(PRIVACY_POLICY_DOCUMENT);
    assert.match(flat, /OpenStreetMap/);
    assert.match(flat, /expo-updates|EAS Updates/i);
    assert.match(flat, /checkAutomatically/);
    assert.match(flat, /\[PRIVACY CONTACT EMAIL\]/);
    assert.match(flat, /Local schematic/);
  });

  it("exposes detectable legal placeholders", () => {
    const flat =
      JSON.stringify(TERMS_OF_USE_DOCUMENT) + JSON.stringify(PRIVACY_POLICY_DOCUMENT);
    for (const placeholder of LEGAL_PLACEHOLDERS) {
      assert.ok(flat.includes(placeholder), placeholder);
    }
  });

  it("uses precise checkbox wording without treating Privacy as blanket consent", () => {
    assert.equal(
      TERMS_CHECKBOX_LABEL,
      "I agree to the Terms of Use and acknowledge the Privacy Policy.",
    );
  });

  it("new TERMS_VERSION forces reacceptance", () => {
    assert.equal(TERMS_VERSION, "0.2-draft");
    const acceptedOld = acceptTerms(DEFAULT_ONBOARDING_STATE, new Date().toISOString());
    // Simulate older acceptance still on disk
    const stale = {
      ...acceptedOld,
      acceptedTermsVersion: "0.1-draft",
    };
    assert.equal(needsTermsAcceptance(stale, TERMS_VERSION), true);
    assert.equal(needsTermsAcceptance(acceptedOld, TERMS_VERSION), false);
  });
});

describe("settings legal and diagnostics gates", () => {
  const hub = readFileSync(join(__dirname, "../../app/(tabs)/settings.tsx"), "utf8");
  const legal = readFileSync(join(__dirname, "../../app/settings/legal.tsx"), "utf8");
  const diagnostics = readFileSync(join(__dirname, "../../app/settings/diagnostics.tsx"), "utf8");
  const layout = readFileSync(join(__dirname, "../../app/settings/_layout.tsx"), "utf8");
  const provider = readFileSync(join(__dirname, "OnboardingProvider.tsx"), "utf8");
  const legalDoc = readFileSync(join(__dirname, "../../app/legal-document.tsx"), "utf8");

  it("hub shows Legal title and gates Diagnostics with internalToolsEnabled", () => {
    assert.match(hub, /title="Legal"/);
    assert.match(hub, /accessibilityLabel="Legal"/);
    assert.doesNotMatch(hub, /Legal & Onboarding/);
    assert.match(hub, /internalToolsEnabled/);
    assert.match(hub, /showDiagnostics/);
    assert.match(hub, /title="Diagnostics"/);
  });

  it("Diagnostics visible for development and preview, hidden for production", () => {
    assert.equal(
      areInternalToolsEnabled({
        isDev: false,
        appOwnership: "standalone",
        updatesChannel: "development",
      }),
      true,
    );
    assert.equal(
      areInternalToolsEnabled({
        isDev: false,
        appOwnership: "standalone",
        updatesChannel: "preview",
      }),
      true,
    );
    assert.equal(
      areInternalToolsEnabled({
        isDev: false,
        appOwnership: "standalone",
        updatesChannel: "production",
      }),
      false,
    );
  });

  it("diagnostics deep link redirects in production and Legal uses chrome header", () => {
    assert.match(diagnostics, /internalToolsEnabled/);
    assert.match(diagnostics, /router\.replace\("\/\(tabs\)\/settings"/);
    assert.match(legal, /SettingsChromeHeader/);
    assert.match(legal, /title="Legal"/);
    assert.match(legal, /headerShown:\s*false/);
    assert.match(legal, /BackHandler/);
    assert.match(layout, /title: "Legal"/);
    assert.doesNotMatch(layout, /Legal & Onboarding/);
  });

  it("Reset onboarding is internal-only and protected in provider", () => {
    assert.match(legal, /Developer tools/);
    assert.match(legal, /showDeveloperTools/);
    assert.match(legal, /Reset onboarding/);
    assert.match(legal, /internalToolsEnabled/);
    assert.match(provider, /if \(!internalToolsEnabled\(\)\) return;/);
    // production path must not render Reset when gate is false — section is conditional
    assert.match(legal, /showDeveloperTools \? \(/);
  });

  it("legal document renders structured draft without WebView/HTML injection", () => {
    assert.match(legalDoc, /getLegalDocument/);
    assert.match(legalDoc, /LEGAL_DRAFT_BANNER/);
    assert.match(legalDoc, /SettingsChromeHeader/);
    assert.match(legalDoc, /headerShown:\s*false/);
    assert.doesNotMatch(legalDoc, /WebView/);
    assert.doesNotMatch(legalDoc, /dangerouslySetInnerHTML/);
    assert.match(legalDoc, /maxFontSizeMultiplier/);
  });

  it("Privacy Policy remains reachable from Legal", () => {
    assert.match(legal, /Privacy Policy/);
    assert.match(legal, /legal-document\?doc=privacy/);
    assert.match(legal, /legal-document\?doc=terms/);
  });

  it("does not introduce camera mutations", () => {
    assert.doesNotMatch(legal, /cameraMutate|formatSd|createLiveTransport/i);
    assert.doesNotMatch(diagnostics, /cameraMutate|formatSd|createLiveTransport/i);
    assert.doesNotMatch(legal, /\b(POST|PUT)\b/);
    assert.doesNotMatch(diagnostics, /\b(POST|PUT)\b/);
  });
});
