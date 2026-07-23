import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SettingsChromeHeader } from "@/components/settings/SettingsChromeHeader";
import { useAppTheme } from "@/constants/Theme";

/**
 * Shared onboarding chrome — safe-area aware header via SettingsChromeHeader.
 */
export function OnboardingScreenChrome({
  title,
  children,
  onBack,
  backLabel = "Back",
  footer,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
  readonly onBack?: () => void;
  readonly backLabel?: string;
  readonly footer?: React.ReactNode;
}) {
  const { colors, spacing } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <SettingsChromeHeader title={title} onBack={onBack} backLabel={backLabel} />

      <View style={[styles.body, { paddingHorizontal: spacing.lg }]}>{children}</View>

      {footer ? (
        <View
          style={[
            styles.footer,
            {
              paddingHorizontal: spacing.lg,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },
  footer: { gap: 10, paddingTop: 8 },
});
