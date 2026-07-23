import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("CameraConnectionSheet static backdrop", () => {
  const src = readFileSync(join(__dirname, "CameraConnectionSheet.tsx"), "utf8");
  const shell = readFileSync(join(__dirname, "../media/StaticBackdropSheet.tsx"), "utf8");

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

  it("closes via requestClose and defers Connection help until after close", () => {
    assert.match(src, /requestCloseRef/);
    assert.match(src, /pendingAfterCloseRef/);
    assert.match(src, /requestCloseRef\.current\(\)/);
    assert.match(src, /connection-help/);
    assert.doesNotMatch(src, /onClose\(\);\s*router\.push/);
  });

  it("StaticBackdropSheet keeps static scrim and sheet-only translateY", () => {
    assert.match(shell, /animationType="none"/);
    assert.match(shell, /MEDIA_SCRIM_COLOR/);
    assert.match(shell, /Animated\.View/);
    assert.match(shell, /transform:\s*\[\s*\{\s*translateY\s*\}/);
    assert.match(shell, /onRequestClose=\{requestClose\}/);
    assert.match(shell, /onPress=\{requestClose\}/);
    assert.match(shell, /isReduceMotionEnabled/);
    assert.doesNotMatch(shell, /opacity:\s*fade|Animated\.Value\(1\)|opacity:\s*opacity/);
    // Scrim is a plain Pressable, not wrapped in Animated.View
    const scrimIdx = shell.indexOf("styles.scrim");
    const animatedIdx = shell.indexOf("Animated.View");
    assert.ok(scrimIdx >= 0 && animatedIdx >= 0);
    assert.ok(scrimIdx < animatedIdx);
  });
});
