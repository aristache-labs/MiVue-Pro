import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  SWIPE_DISMISS_DISTANCE_PX,
  clampSwipeDownOffset,
  shouldClaimVerticalSwipe,
  shouldDismissFromSwipe,
} from "../media/staticBackdropSwipe";

describe("CameraConnectionSheet static backdrop", () => {
  const src = readFileSync(join(__dirname, "CameraConnectionSheet.tsx"), "utf8");
  const shell = readFileSync(join(__dirname, "../media/StaticBackdropSheet.tsx"), "utf8");
  const filter = readFileSync(join(__dirname, "CameraFilterSheet.tsx"), "utf8");
  const localFilter = readFileSync(join(__dirname, "../local/LocalFilterSheet.tsx"), "utf8");

  it("uses StaticBackdropSheet instead of Modal slide", () => {
    assert.match(src, /StaticBackdropSheet/);
    assert.doesNotMatch(src, /\bModal\b/);
    assert.doesNotMatch(src, /animationType="slide"/);
    assert.doesNotMatch(src, /styles\.backdrop|styles\.avoid/);
  });

  it("exposes camera-connection sheet and scrim test IDs", () => {
    assert.match(src, /sheetTestID="camera-connection-sheet"/);
    assert.match(src, /scrimTestID="camera-connection-scrim"/);
    assert.match(src, /scrimAccessibilityLabel="Close camera connection"/);
  });

  it("adds close X in both title states via CompactSheetHeader / SheetCloseButton", () => {
    assert.match(src, /Camera connection/);
    assert.match(src, /Connect camera/);
    assert.match(src, /CompactSheetHeader/);
    assert.match(src, /closeAccessibilityLabel="Close camera connection"/);
    assert.match(src, /onClose=\{requestClose\}/);
    assert.doesNotMatch(src, /closeButton/);
  });

  it("enables swipe-down only for Camera connection; Filters stay off", () => {
    assert.match(src, /enableSwipeToDismiss/);
    assert.match(src, /dragHandleProps/);
    assert.doesNotMatch(filter, /enableSwipeToDismiss/);
    assert.doesNotMatch(localFilter, /enableSwipeToDismiss/);
  });

  it("closes via requestClose and defers Connection help until after close", () => {
    assert.match(src, /requestCloseRef/);
    assert.match(src, /pendingAfterCloseRef/);
    assert.match(src, /requestCloseRef\.current\(\)/);
    assert.match(src, /connection-help/);
    assert.doesNotMatch(src, /onClose\(\);\s*router\.push/);
  });

  it("keeps Refresh and Connection help outside the CompactSheetHeader chrome", () => {
    const headerIdx = src.indexOf("<CompactSheetHeader");
    const headerEnd = src.indexOf("/>", headerIdx);
    const refreshIdx = src.indexOf('accessibilityLabel="Refresh connection"');
    const helpIdx = src.indexOf('accessibilityLabel="Connection help"');
    assert.ok(headerIdx >= 0 && headerEnd > headerIdx);
    assert.ok(refreshIdx > headerEnd);
    assert.ok(helpIdx > headerEnd);
  });

  it("StaticBackdropSheet keeps static scrim, sheet-only translateY, shared close paths", () => {
    assert.match(shell, /animationType="none"/);
    assert.match(shell, /MEDIA_SCRIM_COLOR/);
    assert.match(shell, /Animated\.View/);
    assert.match(shell, /transform:\s*\[\s*\{\s*translateY\s*\}/);
    assert.match(shell, /onRequestClose=\{requestClose\}/);
    assert.match(shell, /onPress=\{requestClose\}/);
    assert.match(shell, /isReduceMotionEnabled/);
    assert.match(shell, /closingRef\.current/);
    assert.match(shell, /enableSwipeToDismiss/);
    assert.match(shell, /PanResponder/);
    assert.match(shell, /dragHandleProps/);
    assert.doesNotMatch(shell, /opacity:\s*fade|Animated\.Value\(1\)|opacity:\s*opacity/);
    const scrimIdx = shell.indexOf("styles.scrim");
    const animatedIdx = shell.indexOf("Animated.View");
    assert.ok(scrimIdx >= 0 && animatedIdx >= 0);
    assert.ok(scrimIdx < animatedIdx);
  });
});

describe("staticBackdropSwipe helpers", () => {
  it("claims only clear downward vertical swipes", () => {
    assert.equal(shouldClaimVerticalSwipe(0, 8), true);
    assert.equal(shouldClaimVerticalSwipe(2, 10), true);
    assert.equal(shouldClaimVerticalSwipe(20, 10), false);
    assert.equal(shouldClaimVerticalSwipe(0, -10), false);
    assert.equal(shouldClaimVerticalSwipe(0, 3), false);
  });

  it("clamps upward motion to zero (sheet does not move up)", () => {
    assert.equal(clampSwipeDownOffset(-40), 0);
    assert.equal(clampSwipeDownOffset(0), 0);
    assert.equal(clampSwipeDownOffset(40), 40);
  });

  it("dismisses past distance threshold or with enough velocity; otherwise snaps back", () => {
    assert.equal(shouldDismissFromSwipe(SWIPE_DISMISS_DISTANCE_PX - 1, 0), false);
    assert.equal(shouldDismissFromSwipe(SWIPE_DISMISS_DISTANCE_PX, 0), true);
    assert.equal(shouldDismissFromSwipe(40, 1.2), true);
    assert.equal(shouldDismissFromSwipe(40, 0.2), false);
  });
});
