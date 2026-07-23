import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SheetCloseButton", () => {
  const src = readFileSync(join(__dirname, "SheetCloseButton.tsx"), "utf8");

  it("matches Filters close tokens", () => {
    assert.match(src, /name="close"/);
    assert.match(src, /size=\{22\}/);
    assert.match(src, /colors\.textMuted/);
    assert.match(src, /width:\s*44/);
    assert.match(src, /height:\s*44/);
    assert.match(src, /accessibilityRole="button"/);
    assert.match(src, /HitSlop44/);
    assert.doesNotMatch(src, /borderWidth|backgroundColor/);
  });
});

describe("shared sheet close wiring", () => {
  const connection = readFileSync(
    join(__dirname, "../camera/CameraConnectionSheet.tsx"),
    "utf8",
  );
  const cameraFilter = readFileSync(join(__dirname, "../camera/CameraFilterSheet.tsx"), "utf8");
  const localFilter = readFileSync(join(__dirname, "../local/LocalFilterSheet.tsx"), "utf8");
  const library = readFileSync(join(__dirname, "../../app/(tabs)/index.tsx"), "utf8");
  const shell = readFileSync(join(__dirname, "StaticBackdropSheet.tsx"), "utf8");

  it("Camera connection uses SheetCloseButton with requestClose", () => {
    assert.match(connection, /SheetCloseButton/);
    assert.match(connection, /accessibilityLabel="Close camera connection"/);
    assert.match(connection, /onPress=\{requestClose\}/);
    assert.doesNotMatch(connection, /name="close"/);
    assert.match(connection, /enableSwipeToDismiss/);
  });

  it("Camera and Local Filters share SheetCloseButton", () => {
    assert.match(cameraFilter, /SheetCloseButton/);
    assert.match(localFilter, /SheetCloseButton/);
    assert.match(cameraFilter, /accessibilityLabel="Close filters"/);
    assert.match(localFilter, /accessibilityLabel="Close filters"/);
    assert.doesNotMatch(cameraFilter, /name="close"/);
    assert.doesNotMatch(localFilter, /name="close"/);
  });

  it("Sort uses StaticBackdropSheet with centered title and shared close", () => {
    assert.match(library, /StaticBackdropSheet/);
    assert.match(library, /sheetTestID="sort-sheet"/);
    assert.match(library, /scrimTestID="sort-scrim"/);
    assert.match(library, /sortHeaderSide/);
    assert.match(library, /textAlign:\s*"center"/);
    assert.match(library, /accessibilityLabel="Close sort"/);
    assert.match(library, /SheetCloseButton/);
    assert.match(library, /setSort\(opt\.id\);\s*requestClose\(\)/);
    assert.match(shell, /animationType="none"/);
    assert.match(shell, /onRequestClose=\{requestClose\}/);
    assert.match(shell, /onPress=\{requestClose\}/);
    // Sort sheet stays on StaticBackdropSheet; Modal+fade is only for cancel-downloads confirm.
    assert.match(library, /cancelConfirmOpen/);
    assert.match(library, /animationType="fade"/);
  });
});
