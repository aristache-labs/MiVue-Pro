import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { MEDIA_SCRIM_COLOR, MEDIA_SHEET_MS } from "@/components/media/mediaCardTokens";

export type StaticBackdropSheetApi = {
  readonly requestClose: () => void;
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
};

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
}: StaticBackdropSheetProps) {
  const [mounted, setMounted] = useState(false);
  const translateY = useRef(new Animated.Value(slideDistance)).current;
  const closingRef = useRef(false);
  const reduceMotionRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const interceptCloseRef = useRef(interceptClose);
  interceptCloseRef.current = interceptClose;

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
    setMounted(false);
    onCloseRef.current();
  }, []);

  const animateClosed = useCallback(() => {
    if (closingRef.current) return;
    if (interceptCloseRef.current?.()) return;
    closingRef.current = true;
    if (reduceMotionRef.current) {
      translateY.setValue(slideDistance);
      finishClose();
      return;
    }
    Animated.timing(translateY, {
      toValue: slideDistance,
      duration: MEDIA_SHEET_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) finishClose();
      else closingRef.current = false;
    });
  }, [finishClose, slideDistance, translateY]);

  useEffect(() => {
    if (visible) {
      closingRef.current = false;
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

  if (!mounted) return null;

  const body = typeof children === "function" ? children({ requestClose }) : children;

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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: MEDIA_SCRIM_COLOR,
  },
  sheetHost: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
