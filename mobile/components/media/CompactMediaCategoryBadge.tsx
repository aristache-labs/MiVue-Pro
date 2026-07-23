import { StyleSheet, Text, View } from "react-native";

import { CATEGORY_LABEL, categoryColor } from "@/constants/CategoryStyle";
import { Type, useAppTheme } from "@/constants/Theme";
import type { FileCategory } from "@/packages/parsers/src/index";

export type CompactMediaCategoryBadgeProps = {
  readonly category: FileCategory;
  readonly testID?: string;
};

/**
 * Compact category chip for RemoteDetailSheet / Player identity rows.
 * Not used on Library/Local list cards.
 */
export function CompactMediaCategoryBadge({
  category,
  testID = "compact-media-category-badge",
}: CompactMediaCategoryBadgeProps) {
  const { scheme } = useAppTheme();
  const accent = categoryColor(category, scheme);
  const label = CATEGORY_LABEL[category];

  return (
    <View
      style={[styles.badge, { backgroundColor: accent + "22" }]}
      accessibilityLabel={label}
      testID={testID}
    >
      <Text style={[styles.label, { color: accent }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexShrink: 0,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  label: {
    fontSize: 10,
    fontFamily: Type.fontSemi,
  },
});
