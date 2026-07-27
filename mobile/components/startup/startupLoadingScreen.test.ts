import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { APP_NAME } from "../../constants/Brand";

describe("StartupLoadingScreen", () => {
  const screenSrc = readFileSync(join(__dirname, "./StartupLoadingScreen.tsx"), "utf8");
  const layoutSrc = readFileSync(join(__dirname, "../../app/_layout.tsx"), "utf8");
  const logoPath = join(__dirname, "../../assets/images/android-icon-monochrome.png");

  it("uses APP_NAME / Laneory from the central brand constant", () => {
    assert.equal(APP_NAME, "Laneory");
    assert.match(screenSrc, /from ["']@\/constants\/Brand["']/);
    assert.match(screenSrc, /\bAPP_NAME\b/);
    assert.match(screenSrc, /Starting \$\{APP_NAME\}…/);
    assert.match(screenSrc, /\$\{APP_NAME\} is starting/);
    assert.doesNotMatch(screenSrc, /Mio|MiVue/);
  });

  it("shows subtitle, starting message and local-first note", () => {
    assert.match(screenSrc, /Your local dashcam library/);
    assert.match(screenSrc, /Starting \$\{APP_NAME\}…/);
    assert.match(screenSrc, /Local-first · Your recordings stay on your device\./);
    assert.doesNotMatch(screenSrc, /Connecting to camera/);
    assert.doesNotMatch(screenSrc, /ProgressBar|percent|setInterval/);
    assert.doesNotMatch(screenSrc, /\bSkip\b|\bRetry\b|\bContinue\b/);
  });

  it("uses the existing monochrome logo asset with brand tint", () => {
    assert.equal(existsSync(logoPath), true);
    assert.match(screenSrc, /android-icon-monochrome\.png/);
    assert.match(screenSrc, /tintColor:\s*colors\.brand/);
  });

  it("uses theme tokens instead of hardcoded UI colors", () => {
    assert.match(screenSrc, /useAppTheme\(\)/);
    assert.match(screenSrc, /colors\.bg/);
    assert.match(screenSrc, /colors\.surfaceElevated/);
    assert.match(screenSrc, /colors\.borderSoft/);
    assert.match(screenSrc, /colors\.brand/);
    assert.match(screenSrc, /colors\.textMuted/);
    assert.match(screenSrc, /Type\.largeTitle/);
    assert.doesNotMatch(screenSrc, /#[0-9a-fA-F]{3,8}/);
    assert.match(screenSrc, /accessibilityRole="progressbar"/);
    assert.match(screenSrc, /accessibilityLiveRegion="polite"/);
    assert.match(screenSrc, /maxFontSizeMultiplier/);
    assert.match(screenSrc, /useSafeAreaInsets/);
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
  });
});
