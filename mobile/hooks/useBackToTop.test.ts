import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BACK_TO_TOP_HIDE_UP_PX,
  BACK_TO_TOP_JITTER_PX,
  BACK_TO_TOP_NEAR_TOP_PX,
  backToTopListBottomPadding,
  backToTopShowThreshold,
  createBackToTopController,
} from "./useBackToTop";

describe("backToTopShowThreshold", () => {
  it("uses max of 400 and 75% of viewport", () => {
    assert.equal(backToTopShowThreshold(400), 400);
    assert.equal(backToTopShowThreshold(800), 600);
    assert.equal(backToTopShowThreshold(0), 400);
  });
});

describe("backToTopListBottomPadding", () => {
  it("does not inflate padding for empty or non-overflowing lists", () => {
    assert.equal(backToTopListBottomPadding(0, true, 80, 96), 96);
    assert.equal(backToTopListBottomPadding(10, false, 80, 96), 96);
  });

  it("raises padding when overflowing so the pill clears the last card", () => {
    const next = backToTopListBottomPadding(10, true, 80, 96);
    assert.ok(next >= 80 + 44 + 26);
    assert.ok(next >= 96);
  });
});

describe("createBackToTopController", () => {
  const ctx = { enabled: true, hasOverflow: true, itemCount: 40 };

  it("starts hidden", () => {
    const c = createBackToTopController();
    assert.equal(c.getVisible(), false);
  });

  it("ignores negative pull-to-refresh offsets", () => {
    const c = createBackToTopController();
    c.setViewportHeight(600);
    c.handleScroll(0, ctx);
    c.handleScroll(-80, ctx);
    assert.equal(c.getVisible(), false);
  });

  it("stays hidden below the show threshold", () => {
    const c = createBackToTopController();
    c.setViewportHeight(600);
    c.handleScroll(0, ctx);
    c.handleScroll(200, ctx);
    c.handleScroll(350, ctx);
    assert.equal(c.getVisible(), false);
  });

  it("appears after downward scroll past the threshold", () => {
    const c = createBackToTopController();
    c.setViewportHeight(600);
    const threshold = backToTopShowThreshold(600);
    c.handleScroll(0, ctx);
    c.handleScroll(threshold + 20, ctx);
    assert.equal(c.getVisible(), true);
  });

  it("remains visible while scroll is idle (tiny deltas)", () => {
    const c = createBackToTopController();
    c.setViewportHeight(600);
    const threshold = backToTopShowThreshold(600);
    c.handleScroll(0, ctx);
    c.handleScroll(threshold + 40, ctx);
    assert.equal(c.getVisible(), true);
    c.handleScroll(threshold + 40 + (BACK_TO_TOP_JITTER_PX - 1), ctx);
    assert.equal(c.getVisible(), true);
  });

  it("does not flicker on small direction jitter", () => {
    const c = createBackToTopController();
    c.setViewportHeight(600);
    const threshold = backToTopShowThreshold(600);
    c.handleScroll(0, ctx);
    c.handleScroll(threshold + 80, ctx);
    assert.equal(c.getVisible(), true);
    c.handleScroll(threshold + 80 - 3, ctx);
    assert.equal(c.getVisible(), true);
    c.handleScroll(threshold + 80 + 3, ctx);
    assert.equal(c.getVisible(), true);
  });

  it("hides after meaningful upward scrolling", () => {
    const c = createBackToTopController();
    c.setViewportHeight(600);
    const threshold = backToTopShowThreshold(600);
    c.handleScroll(0, ctx);
    c.handleScroll(threshold + 200, ctx);
    assert.equal(c.getVisible(), true);
    c.handleScroll(threshold + 200 - BACK_TO_TOP_HIDE_UP_PX, ctx);
    assert.equal(c.getVisible(), false);
  });

  it("hides close to offset zero", () => {
    const c = createBackToTopController();
    c.setViewportHeight(600);
    const threshold = backToTopShowThreshold(600);
    c.handleScroll(0, ctx);
    c.handleScroll(threshold + 100, ctx);
    assert.equal(c.getVisible(), true);
    c.handleScroll(BACK_TO_TOP_NEAR_TOP_PX, ctx);
    assert.equal(c.getVisible(), false);
  });

  it("disabled / no-overflow / empty hides the control", () => {
    const c = createBackToTopController();
    c.setViewportHeight(600);
    const threshold = backToTopShowThreshold(600);
    c.handleScroll(0, ctx);
    c.handleScroll(threshold + 50, ctx);
    assert.equal(c.getVisible(), true);
    c.handleScroll(threshold + 80, { ...ctx, enabled: false });
    assert.equal(c.getVisible(), false);

    c.handleScroll(0, ctx);
    c.handleScroll(threshold + 50, ctx);
    assert.equal(c.getVisible(), true);
    c.handleScroll(threshold + 80, { ...ctx, hasOverflow: false });
    assert.equal(c.getVisible(), false);

    c.handleScroll(0, ctx);
    c.handleScroll(threshold + 50, ctx);
    assert.equal(c.getVisible(), true);
    c.handleScroll(threshold + 80, { ...ctx, itemCount: 0 });
    assert.equal(c.getVisible(), false);
  });

  it("press/hide clears visibility", () => {
    const c = createBackToTopController();
    c.setViewportHeight(600);
    const threshold = backToTopShowThreshold(600);
    c.handleScroll(0, ctx);
    c.handleScroll(threshold + 50, ctx);
    assert.equal(c.getVisible(), true);
    c.hide();
    assert.equal(c.getVisible(), false);
  });
});
