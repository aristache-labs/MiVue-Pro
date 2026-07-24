import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  CONTEXTUAL_ACTION_PAD_H,
  CONTEXTUAL_CTA_HEIGHT,
  CONTEXTUAL_CTA_MAX_WIDTH,
  TAB_BAR_CONTENT_HEIGHT,
  computeContextualTabGeometry,
} from "./contextualTabGeometry";

describe("computeContextualTabGeometry", () => {
  it("centers CTA in the full container for inset 0 / 21 / 34", () => {
    for (const inset of [0, 21, 34] as const) {
      const geo = computeContextualTabGeometry(inset);
      assert.equal(geo.containerHeight, TAB_BAR_CONTENT_HEIGHT + inset);
      assert.equal(geo.bottomInset, inset);
      assert.equal(geo.topGap, geo.bottomGap);
      assert.ok(Math.abs(geo.buttonTop + geo.buttonHeight / 2 - geo.containerHeight / 2) < 1e-6);
      assert.equal(geo.actionPadH, CONTEXTUAL_ACTION_PAD_H);
      assert.ok(geo.buttonHeight <= CONTEXTUAL_CTA_HEIGHT);
      assert.ok(geo.buttonHeight <= geo.containerHeight);
      assert.equal(geo.clearsHomeIndicator, true);
    }
  });

  it("keeps equal horizontal pad constants and a compact CTA width", () => {
    assert.ok(CONTEXTUAL_ACTION_PAD_H >= 36 && CONTEXTUAL_ACTION_PAD_H <= 40);
    assert.ok(CONTEXTUAL_CTA_HEIGHT >= 48 && CONTEXTUAL_CTA_HEIGHT <= 52);
    assert.equal(TAB_BAR_CONTENT_HEIGHT, 49);
    assert.ok(CONTEXTUAL_CTA_MAX_WIDTH >= 440 && CONTEXTUAL_CTA_MAX_WIDTH <= 480);
    assert.ok(CONTEXTUAL_ACTION_PAD_H > 20);
  });
});

describe("ContextualTabAction layout wiring", () => {
  const action = readFileSync(join(__dirname, "ContextualTabAction.tsx"), "utf8");
  const tabBar = readFileSync(join(__dirname, "../navigation/LaneoryTabBar.tsx"), "utf8");
  const local = readFileSync(join(__dirname, "../../app/(tabs)/local.tsx"), "utf8");
  const index = readFileSync(join(__dirname, "../../app/(tabs)/index.tsx"), "utf8");

  it("uses tab-bar surface only — no soft tint overlays", () => {
    assert.doesNotMatch(action, /dangerSoft|brandSoft/);
    assert.match(action, /backgroundColor: colors\.surface/);
    assert.match(action, /fill = isDanger \? colors\.danger : colors\.brand/);
    assert.match(action, /justifyContent: "center"/);
    assert.match(action, /alignItems: "center"/);
    assert.match(action, /alignSelf: "stretch"/);
    assert.match(action, /paddingLeft: CONTEXTUAL_ACTION_PAD_H/);
    assert.match(action, /paddingRight: CONTEXTUAL_ACTION_PAD_H/);
    assert.doesNotMatch(action, /paddingBottom:\s*insets|paddingBottom:\s*bottomInset|paddingBottom:\s*geo/);
    assert.doesNotMatch(action, /actionArea|safeArea|BottomSafeArea/);
    assert.doesNotMatch(action, /useSafeAreaInsets/);
  });

  it("LaneoryTabBar owns inset once; Local/Library share one CTA component", () => {
    assert.match(tabBar, /computeContextualTabGeometry\(insets\.bottom\)/);
    assert.match(tabBar, /bottomInset=\{insets\.bottom\}/);
    assert.match(tabBar, /TAB_BAR_CONTENT_HEIGHT/);
    assert.match(tabBar, /tone=\{displayChrome\.kind === "local-delete" \? "danger" : "brand"\}/);
    assert.doesNotMatch(local, /ContextualTabAction|CONTEXTUAL_ACTION_PAD/);
    assert.doesNotMatch(index, /ContextualTabAction|CONTEXTUAL_ACTION_PAD/);
  });

  it("uses equal side padding + stretch width; shared maxWidth for both tones", () => {
    assert.match(action, /paddingLeft: CONTEXTUAL_ACTION_PAD_H/);
    assert.match(action, /paddingRight: CONTEXTUAL_ACTION_PAD_H/);
    assert.match(action, /alignSelf: "stretch"/);
    assert.match(action, /maxWidth: CONTEXTUAL_CTA_MAX_WIDTH/);
    assert.doesNotMatch(action, /width:\s*["']8[0-9]%/);
    assert.doesNotMatch(action, /marginLeft|marginRight/);
    assert.match(action, /numberOfLines=\{1\}/);
    assert.match(action, /paddingHorizontal: 16/);
  });

  it("disabled/loading and label length do not redefine frame", () => {
    assert.match(action, /height: geo\.buttonHeight/);
    assert.doesNotMatch(action, /selectedCount/);
    assert.doesNotMatch(action, /label\.length/);
    assert.match(action, /ctaInner/);
  });
});
