import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Developer Logs grouped detail sheet", () => {
  const screen = readFileSync(join(__dirname, "../../app/settings/dev-logs.tsx"), "utf8");
  const shell = readFileSync(join(__dirname, "../media/StaticBackdropSheet.tsx"), "utf8");

  it("opens a grouped log card as an accessible button", () => {
    assert.match(screen, /function LogEntryCard\(\{ entry, onPress \}/);
    assert.match(screen, /accessibilityRole="button"/);
    assert.match(screen, /setSelectedGroupId\(item\.id\)/);
  });

  it("uses the shared sheet with right-side close and sheet-only slide", () => {
    assert.match(screen, /<StaticBackdropSheet/);
    assert.match(screen, /<CompactSheetHeader/);
    assert.match(screen, /title="Log details"/);
    assert.match(screen, /onClose=\{requestClose\}/);
    assert.match(screen, /closeAccessibilityLabel="Close log details"/);
    assert.match(shell, /animationType="none"/);
    assert.match(shell, /<Pressable[\s\S]*styles\.scrim/);
    assert.match(shell, /<Animated\.View/);
    assert.doesNotMatch(shell, /opacity:\s*fade|Animated\.Value\(1\)/);
  });

  it("hugs short content and caps long content with an internal scroll", () => {
    assert.match(screen, /useWindowDimensions\(\)/);
    assert.match(screen, /maxHeight:\s*windowHeight \* 0\.86/);
    assert.match(screen, /detailScroll:\s*\{ flexGrow: 0, flexShrink: 1 \}/);
    assert.match(screen, /<ScrollView/);
  });

  it("shows summary data and every raw occurrence newest first", () => {
    assert.match(screen, />Occurrences</);
    assert.match(screen, />First seen</);
    assert.match(screen, />Last seen</);
    assert.match(screen, />Latest event</);
    assert.match(screen, />All occurrences</);
    assert.match(screen, /group\.entries\.map/);
  });
});
