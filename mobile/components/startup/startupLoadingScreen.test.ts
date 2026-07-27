import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { APP_NAME } from "../../constants/Brand";

describe("StartupLoadingScreen", () => {
  const screenSrc = readFileSync(join(__dirname, "./StartupLoadingScreen.tsx"), "utf8");
  const loaderSrc = readFileSync(join(__dirname, "./LaneoryCapsuleLoader.tsx"), "utf8");
  const layoutSrc = readFileSync(join(__dirname, "../../app/_layout.tsx"), "utf8");
  const logoPath = join(__dirname, "../../assets/images/android-icon-monochrome.png");

  it("uses APP_NAME / Laneory from the central brand constant", () => {
    assert.equal(APP_NAME, "Laneory");
    assert.match(screenSrc, /from ["']@\/constants\/Brand["']/);
    assert.match(screenSrc, /\bAPP_NAME\b/);
    assert.match(screenSrc, /Starting \$\{APP_NAME\}…/);
    assert.match(screenSrc, /\$\{APP_NAME\} is starting/);
    assert.doesNotMatch(screenSrc, /Mio|MiVue/);
    assert.doesNotMatch(loaderSrc, /Mio|MiVue/);
  });

  it("shows subtitle, starting message and local-first note", () => {
    assert.match(screenSrc, /Your local dashcam library/);
    assert.match(screenSrc, /Starting \$\{APP_NAME\}…/);
    assert.match(screenSrc, /Local-first · Your recordings stay on your device\./);
    assert.doesNotMatch(screenSrc, /Connecting to camera/);
    assert.doesNotMatch(screenSrc, /percent|setInterval/);
    assert.doesNotMatch(screenSrc, /\bSkip\b|\bRetry\b|\bContinue\b/);
  });

  it("uses the existing monochrome logo asset with brand tint", () => {
    assert.equal(existsSync(logoPath), true);
    assert.match(screenSrc, /android-icon-monochrome\.png/);
    assert.match(screenSrc, /tintColor:\s*colors\.brand\b/);
  });

  it("replaces ActivityIndicator with the LaneoryCapsuleLoader", () => {
    assert.doesNotMatch(screenSrc, /ActivityIndicator/);
    assert.doesNotMatch(screenSrc, /LaneoryOrbitLoader/);
    assert.match(screenSrc, /import\s*\{\s*LaneoryCapsuleLoader\s*\}/);
    assert.match(screenSrc, /<LaneoryCapsuleLoader\s*\/>/);
  });

  it("uses theme tokens instead of hardcoded UI colors", () => {
    assert.match(screenSrc, /useAppTheme\(\)/);
    assert.match(screenSrc, /colors\.bg/);
    assert.match(screenSrc, /colors\.surfaceElevated/);
    assert.match(screenSrc, /colors\.borderSoft/);
    assert.match(screenSrc, /colors\.brandSoft/);
    assert.match(screenSrc, /colors\.brand\b/);
    assert.match(screenSrc, /colors\.textMuted/);
    assert.match(screenSrc, /Type\.largeTitle/);
    assert.doesNotMatch(screenSrc, /#[0-9a-fA-F]{3,8}/);
    assert.doesNotMatch(screenSrc, /rgba?\(/);
    assert.match(screenSrc, /accessibilityRole="progressbar"/);
    assert.match(screenSrc, /accessibilityLiveRegion="polite"/);
    assert.match(screenSrc, /maxFontSizeMultiplier/);
    assert.match(screenSrc, /useSafeAreaInsets/);
  });

  it("bottom local-first note uses textMuted for AA contrast, not textFaint", () => {
    assert.match(screenSrc, /styles\.note,\s*\{\s*color:\s*colors\.textMuted\s*\}/);
    assert.doesNotMatch(screenSrc, /textFaint/);
  });

  it("plays a single non-repeating entrance animation for the whole center block", () => {
    assert.match(screenSrc, /Animated\.parallel\(/);
    assert.match(screenSrc, /Easing\.out\(Easing\.cubic\)/);
    assert.match(screenSrc, /useNativeDriver:\s*true/);
    assert.match(screenSrc, /\}, \[\]\);/);
    assert.doesNotMatch(screenSrc, /setTimeout/);
  });

  it("logo and capsule loader are decorative for accessibility", () => {
    assert.match(screenSrc, /accessible=\{false\}[\s\S]*importantForAccessibility="no"/);
    assert.match(loaderSrc, /importantForAccessibility="no-hide-descendants"/);
  });

  it("root layout shows React loading until bootstrap is ready", () => {
    assert.match(layoutSrc, /StartupLoadingScreen/);
    assert.match(layoutSrc, /bootReady\s*=\s*ready\s*&&\s*cameraBootstrapDone/);
    assert.match(layoutSrc, /if\s*\(\s*!bootReady\s*\)\s*\{[\s\S]*StartupLoadingScreen/);
    assert.match(layoutSrc, /router\.replace\(["']\/onboarding["']/);
    assert.doesNotMatch(layoutSrc, /setTimeout/);
    assert.doesNotMatch(screenSrc, /setTimeout/);
  });

  it("hides the native splash once after React loading layout mounts", () => {
    assert.match(layoutSrc, /SplashScreen\.preventAutoHideAsync\(\)/);
    assert.match(layoutSrc, /onLayout=\{hideNativeSplash\}/);
    assert.match(layoutSrc, /splashHiddenRef/);
    assert.match(layoutSrc, /if\s*\(\s*splashHiddenRef\.current\s*\)\s*return/);
    assert.match(layoutSrc, /SplashScreen\.hideAsync\(\)/);
    assert.match(layoutSrc, /\.catch\(/);
    assert.doesNotMatch(
      layoutSrc,
      /useEffect\(\s*\(\)\s*=>\s*\{\s*if\s*\(\s*bootReady\s*\)\s*\{[\s\S]*SplashScreen\.hideAsync/,
    );
  });

  it("does not call camera APIs from the startup loading path", () => {
    assert.doesNotMatch(screenSrc, /\bfetch\s*\(/);
    assert.doesNotMatch(screenSrc, /cameraMutate|verifyCamera|cgi-bin/i);
    assert.doesNotMatch(loaderSrc, /\bfetch\s*\(/);
    assert.doesNotMatch(loaderSrc, /cameraMutate|verifyCamera|cgi-bin/i);
  });
});

describe("LaneoryCapsuleLoader", () => {
  const loaderSrc = readFileSync(join(__dirname, "./LaneoryCapsuleLoader.tsx"), "utf8");

  it("is an original reinterpretation, not copied HTML/CSS/styled-components", () => {
    assert.doesNotMatch(loaderSrc, /<div|className=|styled\.|StyledWrapper|keyframes/);
    assert.doesNotMatch(loaderSrc, /styled-components/);
    assert.match(loaderSrc, /Uiverse\.io/);
  });

  it("runs a single continuous loop that returns to its start state (seamless)", () => {
    assert.match(loaderSrc, /Animated\.loop\(/);
    assert.match(loaderSrc, /toValue:\s*1/);
    const stopsMatch = loaderSrc.match(/PROGRESS_STOPS\s*=\s*\[([^\]]+)\]/);
    assert.ok(stopsMatch, "expected PROGRESS_STOPS breakpoints");
    assert.match(stopsMatch![1], /^\s*0\s*,/);
    assert.match(stopsMatch![1], /\b1\s*$/);
    const scaleMatch = loaderSrc.match(/SCALE_STOPS\s*=\s*\[([^\]]+)\]/);
    assert.ok(scaleMatch);
    const scaleValues = scaleMatch![1].split(",").map((s) => s.trim());
    assert.equal(scaleValues[0], scaleValues[scaleValues.length - 1]);
    assert.doesNotMatch(loaderSrc, /bounce|spring|Vibration/i);
  });

  it("uses useNativeDriver and a reasonable cycle duration", () => {
    assert.match(loaderSrc, /useNativeDriver:\s*true/);
    const durationMatch = loaderSrc.match(/CYCLE_MS\s*=\s*(\d+)/);
    assert.ok(durationMatch, "expected a CYCLE_MS constant");
    const duration = Number(durationMatch![1]);
    assert.ok(duration >= 1500 && duration <= 3000, `duration ${duration}ms out of range`);
  });

  it("only animates transform (scaleX/translateX), never layout width", () => {
    assert.match(loaderSrc, /scaleX/);
    assert.match(loaderSrc, /translateX/);
    assert.doesNotMatch(loaderSrc, /Animated\.Value\(.*\)\.interpolate[\s\S]*width:/);
    assert.doesNotMatch(loaderSrc, /toValue:\s*TRACK_WIDTH/);
  });

  it("freezes to a static dot under Reduce Motion instead of animating", () => {
    assert.match(loaderSrc, /isReduceMotionEnabled/);
    assert.match(loaderSrc, /reduceMotionChanged/);
    assert.match(loaderSrc, /if\s*\(\s*reduceMotion\s*\)\s*\{[\s\S]*loopRef\.current\?\.stop\(\)/);
    assert.match(loaderSrc, /progress\.setValue\(0\)/);
  });

  it("stops and cleans up the loop animation on unmount", () => {
    assert.match(loaderSrc, /return\s*\(\)\s*=>\s*\{\s*loopRef\.current\?\.stop\(\);\s*\}/);
  });

  it("uses theme tokens only, no hardcoded colors", () => {
    assert.match(loaderSrc, /useAppTheme\(\)/);
    assert.match(loaderSrc, /colors\.borderSoft/);
    assert.match(loaderSrc, /colors\.brandStrong/);
    assert.doesNotMatch(loaderSrc, /#[0-9a-fA-F]{3,8}/);
    assert.doesNotMatch(loaderSrc, /rgba?\(/);
  });
});
