import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollView, type ScrollViewProps } from "react-native";

import { useAppTheme } from "@/constants/Theme";

/** Shared Settings detail / hub scroll chrome. */
export function SettingsScroll({
  children,
  contentContainerStyle,
  ...rest
}: ScrollViewProps) {
  const { colors, spacing } = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[
        {
          padding: spacing.lg,
          paddingBottom: Math.max(insets.bottom, 24) + 72,
        },
        contentContainerStyle,
      ]}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}
