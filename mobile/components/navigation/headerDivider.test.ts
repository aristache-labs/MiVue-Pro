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
    assert.match(sheetHeaderSrc, /paddingBottom:\s*8/);
    assert.doesNotMatch(sheetHeaderSrc, /titleRow:[\s\S]*?paddingBottom:\s*1[4-9]/);
  });

  it("TabScreenHeader and SettingsChromeHeader render screen divider", () => {
    assert.match(tabSrc, /HeaderDivider/);
    assert.match(tabSrc, /variant="screen"/);
    assert.doesNotMatch(tabSrc, /styles\.divider|backgroundColor:\s*colors\.border\s*\}\]/);
    assert.match(chromeSrc, /HeaderDivider/);
    assert.match(chromeSrc, /variant="screen"/);
    assert.doesNotMatch(chromeSrc, /borderBottomWidth/);
  });

  it("Library and Local Filters share SheetHeader with divider outside ScrollView", () => {
    for (const src of [cameraFilter, localFilter]) {
      assert.match(src, /SheetHeader/);
      assert.match(src, /dividerInset=\{MEDIA_SHEET_PAD_H\}/);
      const headerIdx = src.indexOf("<SheetHeader");
      const scrollIdx = src.indexOf("<ScrollView");
      assert.ok(headerIdx >= 0 && scrollIdx > headerIdx);
    }
  });

  it("Library and Local Sort use SheetHeader divider", () => {
    assert.match(library, /SheetHeader/);
    assert.match(local, /SheetHeader/);
    assert.match(library, /title="Sort"/);
    assert.match(local, /title="Sort"/);
    assert.doesNotMatch(library, /sortHeader:/);
    assert.doesNotMatch(local, /sortHeader:/);
  });

  it("Camera connection and setting sheets render divider", () => {
    assert.match(connection, /HeaderDivider/);
    assert.match(connection, /camera-connection-header-divider/);
    assert.match(setting, /SheetHeader/);
    assert.match(setting, /dividerInset=\{0\}/);
  });

  it("Legal sheets place divider below draft notice", () => {
    assert.match(legal, /SheetHeader/);
    assert.match(legal, /belowTitle/);
    assert.match(legal, /ABOUT_LEGAL_REVIEW_NOTE/);
    const below = legal.indexOf("belowTitle");
    const draft = legal.indexOf("ABOUT_LEGAL_REVIEW_NOTE", below);
    assert.ok(below >= 0 && draft > below);
  });

  it("Remote detail, player, and legal-document use dividers", () => {
    assert.match(detail, /HeaderDivider/);
    assert.match(detail, /SheetCloseButton/);
    assert.match(player, /HeaderDivider/);
    assert.match(player, /player-header-divider/);
    assert.match(legalDoc, /SettingsChromeHeader/);
  });

  it("native DateTimePicker chrome is not restyled by HeaderDivider", () => {
    assert.match(cameraFilter, /DateTimePicker/);
    assert.match(cameraFilter, /iosPickerHeader/);
    assert.doesNotMatch(cameraFilter, /HeaderDivider[\s\S]{0,80}DateTimePicker/);
  });

  it("backdrop and sheet animation contracts remain unchanged", () => {
    assert.match(shell, /animationType="none"/);
    assert.match(shell, /MEDIA_SCRIM_COLOR/);
    assert.match(shell, /translateY/);
    assert.doesNotMatch(shell, /HeaderDivider/);
  });

  it("SheetHeader keeps title geometrically centered and divider decorative", () => {
    assert.match(sheetHeaderSrc, /styles\.side/);
    assert.match(sheetHeaderSrc, /textAlign:\s*"center"/);
    assert.match(sheetHeaderSrc, /HeaderDivider/);
    assert.match(sheetHeaderSrc, /showDivider/);
  });
});
