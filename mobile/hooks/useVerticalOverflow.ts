import { useCallback, useMemo, useState } from "react";
import type { LayoutChangeEvent } from "react-native";

/** Extra px so rounding alone does not enable scroll. */
export const VERTICAL_OVERFLOW_TOLERANCE_PX = 2;

/**
 * Pure overflow check — content must exceed the viewport by more than `tolerance`.
 * Unknown / zero viewport ⇒ no overflow (scroll stays off until measured).
 */
export function computeVerticalOverflow(
  contentHeight: number,
  viewportHeight: number,
  tolerance: number = VERTICAL_OVERFLOW_TOLERANCE_PX,
): boolean {
  if (!(viewportHeight > 0) || !Number.isFinite(viewportHeight)) return false;
  if (!Number.isFinite(contentHeight)) return false;
  return contentHeight > viewportHeight + tolerance;
}

/**
 * Measures a ScrollView viewport vs content and reports whether vertical scroll is needed.
 */
export function useVerticalOverflow(
  tolerance: number = VERTICAL_OVERFLOW_TOLERANCE_PX,
): {
  readonly hasOverflow: boolean;
  readonly onViewportLayout: (event: LayoutChangeEvent) => void;
  readonly onContentSizeChange: (contentWidth: number, contentHeight: number) => void;
} {
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  const onViewportLayout = useCallback((event: LayoutChangeEvent) => {
    setViewportHeight(event.nativeEvent.layout.height);
  }, []);

  const onContentSizeChange = useCallback((_width: number, height: number) => {
    setContentHeight(height);
  }, []);

  const hasOverflow = useMemo(
    () => computeVerticalOverflow(contentHeight, viewportHeight, tolerance),
    [contentHeight, viewportHeight, tolerance],
  );

  return { hasOverflow, onViewportLayout, onContentSizeChange };
}
