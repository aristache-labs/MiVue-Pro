import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("HeaderDivider system", () => {
  const dividerSrc = readFileSync(join(__dirname, "HeaderDivider.tsx"), "utf8");
  const sheetHeaderSrc = readFileSync(join(__dirname, "../sheets/SheetHeader.tsx"), "utf8");
  const tabSrc = readFileSync(join(__dirname, "TabScreenHeader.tsx"), "utf8");
  const chromeSrc = readFileSync(
    join(__dirname, "../settings/SettingsChromeHeader.tsx"),
    "utf8",
  );
  const cameraFilter = readFileSync(
    join(__dirname, "../camera/CameraFilterSheet.tsx"),
    "utf8",
  );
  const localFilter = readFileSync(join(__dirname, "../local/LocalFilterSheet.tsx"), "utf8");
  const library = readFileSync(join(__dirname, "../../app/(tabs)/index.tsx"), "utf8");
  const local = readFileSync(join(__dirname, "../../app/(tabs)/local.tsx"), "utf8");
  const connection = readFileSync(
    join(__dirname, "../camera/CameraConnectionSheet.tsx"),
    "utf8",
  );
  const setting = readFileSync(join(__dirname, "../settings/CameraSettingSheet.tsx"), "utf8");
  const legal = readFileSync(join(__dirname, "../settings/LegalInfoSheet.tsx"), "utf8");
  const detail = readFileSync(join(__dirname, "../camera/RemoteDetailSheet.tsx"), "utf8");
  const player = readFileSync(join(__dirname, "../../app/player.tsx"), "utf8");
  const legalDoc = readFileSync(join(__dirname, "../../app/legal-document.tsx"), "utf8");
  const shell = readFileSync(join(__dirname, "../media/StaticBackdropSheet.tsx"), "utf8");

  it("HeaderDivider uses hairlineWidth and theme tokens", () => {
    assert.match(dividerSrc, /StyleSheet\.hairlineWidth/);
    assert.match(dividerSrc, /colors\.borderSoft/);
    assert.match(dividerSrc, /HEADER_DIVIDER_OPACITY/);
    assert.match(dividerSrc, /HEADER_DIVIDER_SHEET_OPACITY/);
    assert.match(dividerSrc, /isSheet \? colors\.border : colors\.borderSoft/);
    assert.match(dividerSrc, /accessible=\{false\}/);
    assert.match(dividerSrc, /pointerEvents="none"/);
    assert.match(dividerSrc, /variant.*screen|HeaderDividerVariant/);
    assert.match(dividerSrc, /"sheet"/);
  });

  it("SheetHeader keeps compact padding above the sheet divider", () => {
    assert.match(sheetHeaderSrc, /SHEET_HEADER_TO_DIVIDER\s*=\s*2/);
    assert.match(sheetHeaderSrc, /compact\s*=\s*SHEET_HEADER_COMPACT/);
    assert.match(sheetHeaderSrc, /marginTop:\s*toDivider/);
  });

  it("TabScreenHeader and SettingsChromeHeader render screen divider", () => {
    assert.match(tabSrc, /HeaderDivider/);
    assert.match(tabSrc, /variant="screen"/);
    assert.doesNotMatch(tabSrc, /styles\.divider|backgroundColor:\s*colors\.border\s*\}\,/);
    assert.match(chromeSrc, /HeaderDivider/);
    assert.match(chromeSrc, /variant="screen"/);
    assert.doesNotMatch(chromeSrc, /borderBottomWidth/);
  });

  it("Library and Local Filters share CompactSheetHeader with divider outside ScrollView", () => {
    for (const src of [cameraFilter, localFilter]) {
      assert.match(src, /CompactSheetHeader/);
      assert.match(src, /dividerInset=\{MEDIA_SHEET_PAD_H\}/);
      assert.match(src, /SHEET_BODY_PAD_TOP/);
      const headerIdx = src.indexOf("<CompactSheetHeader");
      const scrollIdx = src.indexOf("<ScrollView");
      assert.ok(headerIdx >= 0 && scrollIdx > headerIdx);
    }
  });

  it("Library and Local Sort use CompactSheetHeader divider", () => {
    assert.match(library, /CompactSheetHeader/);
    assert.match(local, /CompactSheetHeader/);
    assert.match(library, /title="Sort"/);
    assert.match(local, /title="Sort"/);
    assert.match(library, /SHEET_BODY_PAD_TOP/);
    assert.match(local, /SHEET_BODY_PAD_TOP/);
    assert.doesNotMatch(library, /sortHeader:/);
    assert.doesNotMatch(local, /sortHeader:/);
  });

  it("Camera connection and setting sheets render divider", () => {
    assert.match(connection, /CompactSheetHeader/);
    assert.match(connection, /camera-connection-header/);
    assert.match(setting, /CompactSheetHeader/);
    assert.match(setting, /dividerInset=\{0\}/);
    assert.match(setting, /SHEET_BODY_PAD_TOP/);
  });

  it("Legal sheets place divider below draft notice", () => {
    assert.match(legal, /CompactSheetHeader/);
    assert.match(legal, /belowTitle/);
    assert.match(legal, /ABOUT_LEGAL_REVIEW_NOTE/);
    assert.match(legal, /SHEET_BODY_PAD_TOP/);
    const below = legal.indexOf("belowTitle");
    const draft = legal.indexOf("ABOUT_LEGAL_REVIEW_NOTE", below);
    assert.ok(below >= 0 && draft > below);
  });

  it("Remote detail, player, and legal-document use dividers", () => {
    assert.match(detail, /HeaderDivider/);
    assert.match(detail, /SheetCloseButton/);
    assert.match(detail, /SHEET_BODY_PAD_TOP/);
    assert.match(player, /HeaderDivider/);
    assert.match(player, /player-header-divider/);
    assert.match(legalDoc, /SettingsChromeHeader/);
  });

  it("iOS date/time picker chrome uses the same HeaderDivider under Cancel/Done", () => {
    assert.match(cameraFilter, /DateTimePicker/);
    assert.match(cameraFilter, /iosPickerHeader/);
    assert.match(cameraFilter, /camera-filter-ios-picker-divider/);
    assert.match(localFilter, /local-filter-ios-picker-divider/);
    const camHeader = cameraFilter.indexOf("iosPickerHeader");
    const camDivider = cameraFilter.indexOf("camera-filter-ios-picker-divider");
    const camPicker = cameraFilter.indexOf("<DateTimePicker", camHeader);
    assert.ok(camHeader >= 0 && camDivider > camHeader && camPicker > camDivider);
  });

  it("backdrop and sheet animation contracts remain unchanged", () => {
    assert.match(shell, /animationType="none"/);
    assert.match(shell, /MEDIA_SCRIM_COLOR/);
    assert.match(shell, /translateY/);
    assert.doesNotMatch(shell, /HeaderDivider/);
  });

  it("CompactSheetHeader keeps title geometrically centered and divider decorative", () => {
    assert.match(sheetHeaderSrc, /sideSlot/);
    assert.match(sheetHeaderSrc, /titleAbsolute/);
    assert.match(sheetHeaderSrc, /HeaderDivider/);
    assert.match(sheetHeaderSrc, /showDivider/);
  });
});
