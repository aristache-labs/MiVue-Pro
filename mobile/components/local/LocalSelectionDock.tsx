import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  LOCAL_SELECTION_DOCK_GAP,
  LOCAL_SELECTION_DOCK_HEIGHT,
} from "@/components/local/localLibrarySelection";
import { Type, useAppTheme } from "@/constants/Theme";

export interface LocalSelectionDockProps {
  readonly visible: boolean;
  readonly bottomOffset: number;
  readonly reduceMotion: boolean;
  readonly shareDisabled?: boolean;
  readonly deleteDisabled?: boolean;
  readonly deleteBusy?: boolean;
  readonly onShare: () => void;
  readonly onDelete: () => void;
  readonly testID?: string;
}

/**
 * Floating Share / Delete dock above the tab bar while Local selection has items.
 */
export function LocalSelectionDock({
  visible,
  bottomOffset,
  reduceMotion,
  shareDisabled = false,
  deleteDisabled = false,
  deleteBusy = false,
  onShare,
  onDelete,
  testID = "local-selection-dock",
}: LocalSelectionDockProps) {
  const { colors, spacing, radius } = useAppTheme();
  const anim = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: reduceMotion ? 0 : 180,
      useNativeDriver: true,
    }).start();
  }, [visible, reduceMotion, anim]);

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      testID={testID}
      style={[
        styles.wrap,
        {
          left: spacing.lg,
          right: spacing.lg,
          bottom: bottomOffset + LOCAL_SELECTION_DOCK_GAP,
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View
        style={[
          styles.shell,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.borderSoft,
            borderRadius: radius.xl,
            minHeight: LOCAL_SELECTION_DOCK_HEIGHT,
          },
        ]}
      >
        <Pressable
          onPress={onShare}
          disabled={shareDisabled || deleteBusy}
          accessibilityRole="button"
          accessibilityLabel="Share selected"
          style={({ pressed }) => [
            styles.action,
            pressed && !shareDisabled ? { backgroundColor: colors.surfaceMuted } : null,
            shareDisabled || deleteBusy ? { opacity: 0.45 } : null,
          ]}
          testID="local-dock-share"
        >
          <Ionicons name="share-outline" size={20} color={colors.text} />
          <Text style={[styles.label, { color: colors.text }]}>Share</Text>
        </Pressable>

        <View style={[styles.divider, { backgroundColor: colors.borderSoft }]} />

        <Pressable
          onPress={onDelete}
          disabled={deleteDisabled || deleteBusy}
          accessibilityRole="button"
          accessibilityLabel="Delete selected"
          style={({ pressed }) => [
            styles.action,
            pressed && !deleteDisabled ? { backgroundColor: colors.dangerSoft } : null,
            deleteDisabled ? { opacity: 0.45 } : null,
          ]}
          testID="local-dock-delete"
        >
          {deleteBusy ? (
            <ActivityIndicator size="small" color={colors.danger} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
              <Text style={[styles.label, { color: colors.danger }]}>Delete</Text>
            </>
          )}
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    zIndex: 20,
  },
  shell: {
    flexDirection: "row",
    alignItems: "stretch",
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  action: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
  },
  label: {
    fontFamily: Type.fontSemi,
    fontSize: 15,
    lineHeight: 20,
  },
});
