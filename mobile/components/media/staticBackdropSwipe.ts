/** Pure swipe-dismiss helpers for StaticBackdropSheet (testable without RN gesture runtime). */

export const SWIPE_DISMISS_DISTANCE_PX = 80;
/** Vertical velocity (px/ms) from PanResponder that counts as a fling dismiss. */
export const SWIPE_DISMISS_VELOCITY = 1.15;
/** Min downward movement before the drag region claims the gesture. */
export const SWIPE_CLAIM_DY_PX = 6;

/** Claim only clear downward vertical drags — ignore up and mostly-horizontal moves. */
export function shouldClaimVerticalSwipe(dx: number, dy: number): boolean {
  if (!(dy > SWIPE_CLAIM_DY_PX)) return false;
  return dy >= Math.abs(dx) * 1.2;
}

/** Sheet may only follow the finger downward. */
export function clampSwipeDownOffset(dy: number): number {
  if (!Number.isFinite(dy) || dy <= 0) return 0;
  return dy;
}

export function shouldDismissFromSwipe(dy: number, vy: number): boolean {
  const distance = Number.isFinite(dy) ? dy : 0;
  const velocity = Number.isFinite(vy) ? vy : 0;
  return distance >= SWIPE_DISMISS_DISTANCE_PX || velocity >= SWIPE_DISMISS_VELOCITY;
}
