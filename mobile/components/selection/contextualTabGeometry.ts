/**
 * Shared geometry for contextual tab CTA (Library Download + Local Delete).
 * CTA is centered in the full tab-bar frame (content + bottom inset).
 */

/** Matches React Navigation default tab content height above safe area. */
export const TAB_BAR_CONTENT_HEIGHT = 49;

/** Preferred CTA button height (pt). Clamped to fit the container. */
export const CONTEXTUAL_CTA_HEIGHT = 50;

/** Equal horizontal padding on the container; CTA stretches to 100% of the padded area. */
export const CONTEXTUAL_ACTION_PAD_H = 38;

/** Max CTA width on wide screens (pt). */
export const CONTEXTUAL_CTA_MAX_WIDTH = 460;

export interface ContextualTabGeometry {
  readonly containerHeight: number;
  readonly buttonHeight: number;
  readonly buttonTop: number;
  readonly buttonBottom: number;
  readonly topGap: number;
  readonly bottomGap: number;
  readonly actionPadH: number;
  readonly bottomInset: number;
  /** True when the CTA frame stays above the last 8pt home-indicator strip. */
  readonly clearsHomeIndicator: boolean;
}

/**
 * Center the CTA in the full contextual container.
 * `bottomInset` contributes to container height once — never as CTA padding.
 */
export function computeContextualTabGeometry(insetsBottom: number): ContextualTabGeometry {
  const bottomInset = Math.max(0, insetsBottom);
  const containerHeight = TAB_BAR_CONTENT_HEIGHT + bottomInset;
  const buttonHeight = Math.min(CONTEXTUAL_CTA_HEIGHT, containerHeight);
  const buttonTop = (containerHeight - buttonHeight) / 2;
  const buttonBottom = buttonTop + buttonHeight;
  const topGap = buttonTop;
  const bottomGap = containerHeight - buttonBottom;
  const homeIndicatorBand = Math.min(bottomInset, 8);
  return {
    containerHeight,
    buttonHeight,
    buttonTop,
    buttonBottom,
    topGap,
    bottomGap,
    actionPadH: CONTEXTUAL_ACTION_PAD_H,
    bottomInset,
    clearsHomeIndicator: buttonBottom <= containerHeight - homeIndicatorBand + 1e-6,
  };
}
