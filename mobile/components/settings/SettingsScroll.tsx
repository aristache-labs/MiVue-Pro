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
      alwaysBounceVertical={false}
      bounces={false}
      overScrollMode="never"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        {
          padding: spacing.lg,
          paddingBottom: Math.max(insets.bottom, 24) + 72,
          flexGrow: 1,
        },
        contentContainerStyle,
      ]}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}
