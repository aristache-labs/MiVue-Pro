import { useCallback, useEffect, useRef, useState } from "react";
import type { FlatList, LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from "react-native";

/** Show only after scrolling past this floor, or 75% of the viewport — whichever is larger. */
export const BACK_TO_TOP_MIN_OFFSET_FLOOR = 400;
export const BACK_TO_TOP_VIEWPORT_FACTOR = 0.75;
/** Ignore scroll deltas smaller than this (px) to reduce direction jitter. */
export const BACK_TO_TOP_JITTER_PX = 4;
/** Cumulative upward travel that hides the control while it is visible. */
export const BACK_TO_TOP_HIDE_UP_PX = 68;
/** Treat offsets at or below this as “near top”. */
export const BACK_TO_TOP_NEAR_TOP_PX = 48;
/** Floating pill height used for list bottom clearance. */
export const BACK_TO_TOP_BUTTON_HEIGHT = 44;
/** Gap between pill and last list card (above tab bar clearance). */
export const BACK_TO_TOP_LIST_GAP = 26;

export function backToTopShowThreshold(viewportHeight: number): number {
  const fromViewport =
    viewportHeight > 0 ? viewportHeight * BACK_TO_TOP_VIEWPORT_FACTOR : BACK_TO_TOP_MIN_OFFSET_FLOOR;
  return Math.max(BACK_TO_TOP_MIN_OFFSET_FLOOR, fromViewport);
}

/** Extra bottom padding so the last item clears the floating pill — only when the list already overflows. */
export function backToTopListBottomPadding(
  itemCount: number,
  hasOverflow: boolean,
  tabBarHeight: number,
  baseFilledPad: number,
): number {
  if (itemCount <= 0 || !hasOverflow) return baseFilledPad;
  const clearance = tabBarHeight + BACK_TO_TOP_BUTTON_HEIGHT + BACK_TO_TOP_LIST_GAP;
  return Math.max(baseFilledPad, clearance);
}

export interface BackToTopScrollContext {
  readonly enabled: boolean;
  readonly hasOverflow: boolean;
  readonly itemCount: number;
}

/**
 * Pure scroll controller — unit-tested without React.
 * Negative pull-to-refresh offsets are clamped to 0 before evaluation.
 */
export function createBackToTopController() {
  let visible = false;
  let viewportHeight = 0;
  let lastOffset = 0;
  let upAccum = 0;
  let hasLastOffset = false;

  const threshold = () => backToTopShowThreshold(viewportHeight);

  const hide = () => {
    visible = false;
    upAccum = 0;
  };

  return {
    getVisible: () => visible,
    getViewportHeight: () => viewportHeight,
    setViewportHeight(height: number) {
      if (Number.isFinite(height) && height >= 0) viewportHeight = height;
    },
    /** Force-hide (press, disabled sheets, empty list). */
    hide() {
      hide();
    },
    /**
     * Process a scroll offset. Returns whether `visible` changed.
     */
    handleScroll(rawOffsetY: number, ctx: BackToTopScrollContext): boolean {
      const was = visible;

      if (!ctx.enabled || !ctx.hasOverflow || ctx.itemCount <= 0) {
        hide();
        return was !== visible;
      }

      const y = rawOffsetY < 0 ? 0 : rawOffsetY;

      if (!hasLastOffset) {
        hasLastOffset = true;
        lastOffset = y;
        return was !== visible;
      }

      const delta = y - lastOffset;
      if (Math.abs(delta) < BACK_TO_TOP_JITTER_PX) {
        lastOffset = y;
        return false;
      }

      if (y <= BACK_TO_TOP_NEAR_TOP_PX) {
        hide();
        lastOffset = y;
        return was !== visible;
      }

      if (delta > 0) {
        upAccum = 0;
        if (!visible && y >= threshold()) {
          visible = true;
        }
      } else {
        upAccum += -delta;
        if (visible && upAccum >= BACK_TO_TOP_HIDE_UP_PX) {
          hide();
        }
      }

      lastOffset = y;
      return was !== visible;
    },
  };
}

export type BackToTopController = ReturnType<typeof createBackToTopController>;

export interface UseBackToTopOptions {
  readonly enabled: boolean;
  readonly hasOverflow: boolean;
  readonly itemCount: number;
}

export function useBackToTop({ enabled, hasOverflow, itemCount }: UseBackToTopOptions) {
  const listRef = useRef<FlatList>(null);
  const controllerRef = useRef(createBackToTopController());
  const ctxRef = useRef({ enabled, hasOverflow, itemCount });
  ctxRef.current = { enabled, hasOverflow, itemCount };

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled || !hasOverflow || itemCount <= 0) {
      controllerRef.current.hide();
      setVisible(false);
    }
  }, [enabled, hasOverflow, itemCount]);

  const syncVisible = useCallback(() => {
    const next = controllerRef.current.getVisible();
    setVisible((prev) => (prev === next ? prev : next));
  }, []);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    controllerRef.current.setViewportHeight(event.nativeEvent.layout.height);
  }, []);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      const changed = controllerRef.current.handleScroll(y, ctxRef.current);
      if (changed) syncVisible();
    },
    [syncVisible],
  );

  const hide = useCallback(() => {
    controllerRef.current.hide();
    setVisible(false);
  }, []);

  const scrollToTop = useCallback((animated: boolean) => {
    controllerRef.current.hide();
    setVisible(false);
    listRef.current?.scrollToOffset({ offset: 0, animated });
  }, []);

  return {
    listRef,
    visible,
    onScroll,
    onLayout,
    hide,
    scrollToTop,
    scrollEventThrottle: 16 as const,
  };
}
