import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

import {
  ABOUT_LEGAL_REVIEW_NOTE,
  ABOUT_SHEET_SECTIONS,
  DISCLAIMER_SHEET_SECTIONS,
  MAP_ATTRIBUTION_LINES,
} from "./aboutLegalContent";
import { thirdPartyLicenses } from "../../generated/thirdPartyLicenses";

describe("About Laneory screen", () => {
  const aboutSrc = readFileSync(join(__dirname, "../../app/settings/about.tsx"), "utf8");
  const layoutSrc = readFileSync(join(__dirname, "../../app/settings/_layout.tsx"), "utf8");
  const sheetSrc = readFileSync(join(__dirname, "./LegalInfoSheet.tsx"), "utf8");

  it("uses SettingsChromeHeader with Back and Settings fallback", () => {
    assert.match(aboutSrc, /SettingsChromeHeader/);
    assert.match(aboutSrc, /title="About Laneory"/);
    assert.doesNotMatch(aboutSrc, /showBackLabel=\{false\}/);
    assert.match(aboutSrc, /headerShown:\s*false/);
    assert.match(layoutSrc, /name="about"[^]*headerShown:\s*false/);
    assert.match(aboutSrc, /router\.canGoBack\(\)/);
    assert.match(aboutSrc, /\/\(tabs\)\/settings/);
    assert.match(aboutSrc, /BackHandler/);
  });

  it("opens About / Disclaimer / Licences as sheets, not routes", () => {
    assert.match(aboutSrc, /setSheet\("about"\)/);
    assert.match(aboutSrc, /setSheet\("disclaimer"\)/);
    assert.match(aboutSrc, /setSheet\("licenses"\)/);
    assert.match(aboutSrc, /LegalInfoSheet/);
    assert.match(aboutSrc, /sheet !== null/);
    assert.doesNotMatch(aboutSrc, /about-detail|\/settings\/disclaimer|\/settings\/licenses/);
    assert.doesNotMatch(layoutSrc, /about-detail|disclaimer|licenses/);
    assert.equal(existsSync(join(__dirname, "../../app/settings/about-detail.tsx")), false);
    assert.equal(existsSync(join(__dirname, "../../app/settings/disclaimer.tsx")), false);
    assert.equal(existsSync(join(__dirname, "../../app/settings/licenses.tsx")), false);
  });

  it("LegalInfoSheet uses StaticBackdropSheet with close and scroll surfaces", () => {
    assert.match(sheetSrc, /StaticBackdropSheet/);
    assert.match(sheetSrc, /requestClose/);
    assert.match(sheetSrc, /ScrollView|FlatList/);
    assert.match(sheetSrc, /accessibilityViewIsModal|scrimAccessibilityLabel/);
    assert.match(sheetSrc, /maxFontSizeMultiplier/);
  });

  it("includes essential read-only, independence and safety copy", () => {
    const aboutFlat = JSON.stringify(ABOUT_SHEET_SECTIONS);
    const discFlat = JSON.stringify(DISCLAIMER_SHEET_SECTIONS);
    assert.match(aboutFlat, /GET and HEAD/);
    assert.match(aboutFlat, /not affiliated/);
    assert.match(aboutFlat, /Mio or MiTAC/);
    assert.match(discFlat, /while driving/);
    assert.match(discFlat, /safety-critical/);
    assert.match(discFlat, /legal advice|Legal review/i);
    assert.equal(ABOUT_LEGAL_REVIEW_NOTE, "DRAFT · Legal review required");
    assert.ok(MAP_ATTRIBUTION_LINES.some((l) => /OpenStreetMap/i.test(l)));
  });
});

describe("third-party licence inventory", () => {
  it("matches current package-lock hash prefix", () => {
    const lockPath = join(__dirname, "../../package-lock.json");
    const hash = createHash("sha256")
      .update(readFileSync(lockPath))
      .digest("hex")
      .slice(0, 16);
    assert.equal(thirdPartyLicenses.lockfileSha256Prefix, hash);
    assert.ok(thirdPartyLicenses.packageCount > 100);
    assert.equal(thirdPartyLicenses.packages.length, thirdPartyLicenses.packageCount);
  });

  it("includes key runtime packages and flags http10-tcp blocker", () => {
    const names = new Set(thirdPartyLicenses.packages.map((p) => p.name));
    for (const required of [
      "expo",
      "react",
      "react-native",
      "expo-router",
      "@react-native-async-storage/async-storage",
      "react-native-webview",
      "@expo/vector-icons",
      "@expo-google-fonts/ibm-plex-mono",
      "@expo-google-fonts/source-sans-3",
      "http10-tcp",
    ]) {
      assert.ok(names.has(required), required);
    }
    assert.ok(thirdPartyLicenses.blockers.some((b) => b.name === "http10-tcp"));
    assert.match(thirdPartyLicenses.draftBanner, /DRAFT/);
    assert.match(thirdPartyLicenses.mapAttribution.lines.join(" "), /OpenStreetMap/);
  });

  it("stores license text keys for packages", () => {
    const sample = thirdPartyLicenses.packages.find((p) => p.name === "react");
    assert.ok(sample);
    assert.ok(thirdPartyLicenses.licenseTexts[sample!.licenseTextKey]?.length);
  });

  it("treats incomplete runtime licence metadata as a release concern", () => {
    assert.ok(thirdPartyLicenses.blockers.length >= 1);
    assert.ok(
      thirdPartyLicenses.blockers.every((b) => b.reason.length > 0 && b.name.length > 0),
    );
  });
});
