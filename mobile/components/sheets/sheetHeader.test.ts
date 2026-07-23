import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("CompactSheetHeader chrome", () => {
  const sheetHeaderSrc = readFileSync(join(__dirname, "SheetHeader.tsx"), "utf8");
  const closeSrc = readFileSync(join(__dirname, "../media/SheetCloseButton.tsx"), "utf8");
  const tabSrc = readFileSync(join(__dirname, "../navigation/TabScreenHeader.tsx"), "utf8");
  const chromeSrc = readFileSync(join(__dirname, "../settings/SettingsChromeHeader.tsx"), "utf8");
  const cameraFilter = readFileSync(join(__dirname, "../camera/CameraFilterSheet.tsx"), "utf8");
  const setting = readFileSync(join(__dirname, "../settings/CameraSettingSheet.tsx"), "utf8");
  const library = readFileSync(join(__dirname, "../../app/(tabs)/index.tsx"), "utf8");
  const connection = readFileSync(join(__dirname, "../camera/CameraConnectionSheet.tsx"), "utf8");

  it("locks header row at 44px and divider marginTop ≤6", () => {
    assert.match(sheetHeaderSrc, /SHEET_HEADER_ROW_HEIGHT\s*=\s*44/);
    assert.match(sheetHeaderSrc, /height:\s*SHEET_HEADER_ROW_HEIGHT/);
    assert.match(sheetHeaderSrc, /minHeight:\s*SHEET_HEADER_ROW_HEIGHT/);
    assert.match(sheetHeaderSrc, /maxHeight:\s*SHEET_HEADER_ROW_HEIGHT/);
    assert.match(sheetHeaderSrc, /paddingVertical:\s*0/);
    assert.match(sheetHeaderSrc, /SHEET_HEADER_TO_DIVIDER\s*=\s*2/);
    assert.match(sheetHeaderSrc, /marginTop:\s*toDivider/);
    assert.doesNotMatch(sheetHeaderSrc, /paddingVertical:\s*20/);
    assert.doesNotMatch(sheetHeaderSrc, /minHeight:\s*64/);
    assert.doesNotMatch(sheetHeaderSrc, /marginBottom:\s*24/);
  });

  it("defaults to compact spacing constants under the 76/60 budgets", () => {
    assert.match(sheetHeaderSrc, /SHEET_HEADER_COMPACT\s*=\s*true/);
    assert.match(sheetHeaderSrc, /compact\s*=\s*SHEET_HEADER_COMPACT/);
    assert.match(sheetHeaderSrc, /SHEET_HEADER_HANDLE_TOP\s*=\s*8/);
    assert.match(sheetHeaderSrc, /SHEET_HEADER_HANDLE_TO_ROW\s*=\s*5/);
    assert.match(sheetHeaderSrc, /SHEET_BODY_PAD_TOP\s*=\s*16/);
    assert.match(sheetHeaderSrc, /SHEET_BODY_PAD_TOP_CONNECTION\s*=\s*20/);
    assert.match(sheetHeaderSrc, /export function CompactSheetHeader/);
  });

  it("renders a single HeaderDivider when showDivider is true", () => {
    const matches = sheetHeaderSrc.match(/<HeaderDivider/g) ?? [];
    assert.equal(matches.length, 1);
    assert.match(sheetHeaderSrc, /showDivider/);
  });

  it("keeps title geometrically centered with absolute layout and equal side slots", () => {
    assert.match(sheetHeaderSrc, /titleAbsolute/);
    assert.match(sheetHeaderSrc, /position:\s*"absolute"/);
    assert.match(sheetHeaderSrc, /sideSlot/);
    assert.match(sheetHeaderSrc, /leftAction \?\?/);
  });

  it("Close control exposes button role, accessibilityLabel, and hitSlop", () => {
    assert.match(closeSrc, /accessibilityRole="button"/);
    assert.match(closeSrc, /accessibilityLabel/);
    assert.match(closeSrc, /hitSlop=\{HitSlop44\}/);
    assert.match(closeSrc, /width:\s*44/);
    assert.match(closeSrc, /height:\s*44/);
  });

  it("Filters Reset keeps button role; Frequency/Sort/Filters share CompactSheetHeader", () => {
    assert.match(cameraFilter, /CompactSheetHeader/);
    assert.match(cameraFilter, /accessibilityRole="button"/);
    assert.match(cameraFilter, /accessibilityLabel="Reset filters"/);
    assert.match(cameraFilter, /hitSlop=\{HitSlop44\}/);
    assert.match(cameraFilter, /SHEET_BODY_PAD_TOP/);
    assert.doesNotMatch(cameraFilter, /paddingTop:\s*Spacing\.xl|paddingTop:\s*spacing\.xl/);
    assert.match(setting, /CompactSheetHeader/);
    assert.match(setting, /content:\s*\{\s*paddingTop:\s*SHEET_BODY_PAD_TOP\s*\}/);
    assert.doesNotMatch(setting, /marginTop:\s*SHEET_BODY_PAD_TOP/);
    assert.match(library, /CompactSheetHeader/);
    assert.match(library, /title="Sort"/);
    assert.match(library, /SHEET_BODY_PAD_TOP/);
  });

  it("page headers do not use CompactSheetHeader chrome", () => {
    assert.doesNotMatch(tabSrc, /CompactSheetHeader/);
    assert.doesNotMatch(chromeSrc, /CompactSheetHeader/);
    assert.doesNotMatch(tabSrc, /SheetHeader/);
    assert.doesNotMatch(chromeSrc, /SheetHeader/);
    assert.doesNotMatch(tabSrc, /SHEET_BODY_PAD_TOP/);
    assert.doesNotMatch(chromeSrc, /SHEET_BODY_PAD_TOP/);
  });

  it("Camera connection uses shared CompactSheetHeader without first-child marginTop", () => {
    assert.match(connection, /CompactSheetHeader/);
    assert.doesNotMatch(connection, /titleAlign=/);
    assert.match(connection, /camera-connection-header/);
    assert.match(connection, /SHEET_BODY_PAD_TOP_CONNECTION/);
    assert.match(connection, /content:\s*\{[\s\S]*paddingTop:\s*SHEET_BODY_PAD_TOP_CONNECTION/);
    assert.doesNotMatch(connection, /marginTop:\s*SHEET_BODY_PAD_TOP/);
    assert.doesNotMatch(connection, /dragRegion/);
  });
});
