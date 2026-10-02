import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderHandlers,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { MEDIA_SCRIM_COLOR, MEDIA_SHEET_MS } from "@/components/media/mediaCardTokens";
import {
  clampSwipeDownOffset,
  shouldClaimVerticalSwipe,
  shouldDismissFromSwipe,
} from "@/components/media/staticBackdropSwipe";

export type StaticBackdropSheetApi = {
  readonly requestClose: () => void;
  /** Attach to handle/header drag region only — not scrollable or primary actions. */
  readonly dragHandleProps: GestureResponderHandlers;
};

type StaticBackdropSheetProps = {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly children: ReactNode | ((api: StaticBackdropSheetApi) => ReactNode);
  readonly sheetStyle?: StyleProp<ViewStyle>;
  readonly sheetTestID?: string;
  readonly scrimTestID?: string;
  readonly scrimAccessibilityLabel?: string;
  readonly slideDistance?: number;
  /** Return true to consume the close (e.g. dismiss an inline picker first). */
  readonly interceptClose?: () => boolean;
  /**
   * Optional swipe-down-to-dismiss via dragHandleProps.
   * Off by default so scrollable sheets (Filters, details) are unaffected.
   */
  readonly enableSwipeToDismiss?: boolean;
  /** Fires once after the close animation finishes and the modal unmounts. */
  readonly onClosed?: () => void;
};

const EMPTY_DRAG_HANDLERS: GestureResponderHandlers = {};

/**
 * Shared modal shell: static full-screen scrim + sheet-only translateY.
 * Filters and remote media details must use this — never animate the scrim.
 */
export function StaticBackdropSheet({
  visible,
  onClose,
  children,
  sheetStyle,
  sheetTestID = "static-backdrop-sheet",
  scrimTestID = "static-backdrop-scrim",
  scrimAccessibilityLabel = "Close",
  slideDistance = 420,
  interceptClose,
  enableSwipeToDismiss = false,
  onClosed,
}: StaticBackdropSheetProps) {
  const [mounted, setMounted] = useState(false);
  const translateY = useRef(new Animated.Value(slideDistance)).current;
  const closingRef = useRef(false);
  const reduceMotionRef = useRef(false);
  const draggingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;
  const interceptCloseRef = useRef(interceptClose);
  interceptCloseRef.current = interceptClose;
  const slideDistanceRef = useRef(slideDistance);
  slideDistanceRef.current = slideDistance;
  const enableSwipeRef = useRef(enableSwipeToDismiss);
  enableSwipeRef.current = enableSwipeToDismiss;

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (alive) reduceMotionRef.current = v;
    });
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", (v) => {
      reduceMotionRef.current = v;
    });
    return () => {
      alive = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sub as any)?.remove?.();
    };
  }, []);

  const finishClose = useCallback(() => {
    closingRef.current = false;
    draggingRef.current = false;
    setMounted(false);
    onCloseRef.current();
    onClosedRef.current?.();
  }, []);

  const animateClosed = useCallback(() => {
    if (closingRef.current) return;
    if (interceptCloseRef.current?.()) return;
    closingRef.current = true;
    draggingRef.current = false;
    if (reduceMotionRef.current) {
      translateY.setValue(slideDistanceRef.current);
      finishClose();
      return;
    }
    Animated.timing(translateY, {
      toValue: slideDistanceRef.current,
      duration: MEDIA_SHEET_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) finishClose();
      else closingRef.current = false;
    });
  }, [finishClose, translateY]);

  const snapOpen = useCallback(() => {
    if (closingRef.current) return;
    if (reduceMotionRef.current) {
      translateY.setValue(0);
      return;
    }
    Animated.timing(translateY, {
      toValue: 0,
      duration: MEDIA_SHEET_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [translateY]);

  useEffect(() => {
    if (visible) {
      closingRef.current = false;
      draggingRef.current = false;
      setMounted(true);
      translateY.setValue(slideDistance);
      if (reduceMotionRef.current) {
        translateY.setValue(0);
        return;
      }
      Animated.timing(translateY, {
        toValue: 0,
        duration: MEDIA_SHEET_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (!visible && mounted) {
      animateClosed();
    }
  }, [visible, mounted, animateClosed, translateY, slideDistance]);

  const requestClose = useCallback(() => {
    if (!mounted || closingRef.current) return;
    animateClosed();
  }, [animateClosed, mounted]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_evt, gesture) => {
          if (!enableSwipeRef.current || closingRef.current) return false;
          return shouldClaimVerticalSwipe(gesture.dx, gesture.dy);
        },
        onMoveShouldSetPanResponderCapture: (_evt, gesture) => {
          if (!enableSwipeRef.current || closingRef.current) return false;
          return shouldClaimVerticalSwipe(gesture.dx, gesture.dy);
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          if (closingRef.current) return;
          draggingRef.current = true;
          translateY.stopAnimation();
        },
        onPanResponderMove: (_evt, gesture) => {
          if (!draggingRef.current || closingRef.current) return;
          translateY.setValue(clampSwipeDownOffset(gesture.dy));
        },
        onPanResponderRelease: (_evt, gesture) => {
          if (!draggingRef.current) return;
          draggingRef.current = false;
          if (closingRef.current) return;
          if (shouldDismissFromSwipe(gesture.dy, gesture.vy)) {
            animateClosed();
            return;
          }
          snapOpen();
        },
        onPanResponderTerminate: () => {
          if (!draggingRef.current || closingRef.current) return;
          draggingRef.current = false;
          snapOpen();
        },
      }),
    [animateClosed, snapOpen, translateY],
  );

  if (!mounted) return null;

  const dragHandleProps = enableSwipeToDismiss ? panResponder.panHandlers : EMPTY_DRAG_HANDLERS;
  const body =
    typeof children === "function" ? children({ requestClose, dragHandleProps }) : children;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={requestClose}
      statusBarTranslucent
      accessibilityViewIsModal
    >
      <View style={styles.root} pointerEvents="box-none">
        <Pressable
          style={styles.scrim}
          onPress={requestClose}
          accessibilityRole="button"
          accessibilityLabel={scrimAccessibilityLabel}
          testID={scrimTestID}
        />
        <Animated.View
          style={[styles.sheetHost, sheetStyle, { transform: [{ translateY }] }]}
          testID={sheetTestID}
        >
          {body}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: MEDIA_SCRIM_COLOR,
  },
  sheetHost: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
