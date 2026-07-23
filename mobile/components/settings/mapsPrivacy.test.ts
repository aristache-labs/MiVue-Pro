import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("maps-privacy screen", () => {
  const mapsSrc = readFileSync(join(__dirname, "../../app/settings/maps-privacy.tsx"), "utf8");
  const legalSrc = readFileSync(join(__dirname, "../../app/settings/legal.tsx"), "utf8");

  it("uses SettingsChromeHeader and Back navigation", () => {
    assert.match(mapsSrc, /SettingsChromeHeader/);
    assert.match(mapsSrc, /title="Maps & Privacy"/);
    assert.match(mapsSrc, /headerShown:\s*false/);
    assert.match(mapsSrc, /router\.canGoBack\(\)/);
    assert.match(mapsSrc, /BackHandler/);
    assert.match(mapsSrc, /useFocusEffect/);
    assert.match(mapsSrc, /\/\(tabs\)\/settings/);
  });

  it("binds selection to DemoMode mapPreference only", () => {
    assert.match(mapsSrc, /mapPreference/);
    assert.match(mapsSrc, /setMapPreference/);
    assert.doesNotMatch(mapsSrc, /AsyncStorage/);
    assert.doesNotMatch(mapsSrc, /useState\s*[<(]/);
  });

  it("documents OpenStreetMap and omits Google Maps SDK", () => {
    assert.match(mapsSrc, /OpenStreetMap/);
    assert.doesNotMatch(mapsSrc, /Google Maps SDK/i);
    assert.doesNotMatch(mapsSrc, /Google Maps/i);
  });

  it("removes Privacy Policy from Maps & Privacy but Legal keeps it", () => {
    assert.doesNotMatch(mapsSrc, /Privacy Policy/);
    assert.doesNotMatch(mapsSrc, /LEGAL_DRAFT_BANNER/);
    assert.doesNotMatch(mapsSrc, /SettingsActionRow/);
    assert.doesNotMatch(mapsSrc, /legal-document\?doc=privacy/);
    assert.match(legalSrc, /Privacy Policy/);
    assert.match(legalSrc, /legal-document\?doc=privacy/);
  });

  it("keeps local connection privacy and read-only footnote", () => {
    assert.match(mapsSrc, /Camera Wi-Fi/);
    assert.match(mapsSrc, /GET\/HEAD read-only/);
    assert.doesNotMatch(mapsSrc, /\bPOST\b|\bPUT\b|\bDELETE\b/);
    assert.doesNotMatch(mapsSrc, /createLiveTransport|cameraMutate|formatSd|cgi/i);
  });

  it("exposes accessible radio options for map preference", () => {
    assert.match(mapsSrc, /accessibilityRole="radiogroup"/);
    assert.match(mapsSrc, /accessibilityRole="radio"/);
    assert.match(mapsSrc, /accessibilityState=\{\{\s*selected\s*\}\}/);
    assert.match(mapsSrc, /minHeight:\s*44/);
  });
});
