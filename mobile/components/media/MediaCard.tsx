import type { ReactNode } from "react";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  MEDIA_ACTION_HIT,
  MEDIA_CARD_GAP,
  MEDIA_CARD_PADDING,
  MEDIA_CATEGORY_BADGE_MIN_H,
  MEDIA_THUMB_H,
  MEDIA_THUMB_W,
} from "@/components/media/mediaCardTokens";
import { Card } from "@/components/ui";
import { Type, useAppTheme } from "@/constants/Theme";

export type MediaCardSource = "camera" | "local";

export interface MediaCardProps {
  readonly source: MediaCardSource;
  readonly title: string;
  readonly whenLabel?: string;
  readonly sizeLabel: string;
  readonly categoryLabel: string;
  readonly categoryAccent: string;
  readonly durationLabel?: string;
  /** Thumbnail content (image / camera thumb / placeholder). Sized by parent tokens. */
  readonly thumbnail: ReactNode;
  /** Optional overlay above thumbnail (play glyph, selection mark). */
  readonly thumbnailOverlay?: ReactNode;
  readonly onThumbPress?: () => void;
  readonly thumbAccessibilityLabel?: string;
  readonly onBodyPress?: () => void;
  readonly bodyAccessibilityLabel?: string;
  /** Right-column actions (download / share-delete). Pure slot — no business logic. */
  readonly actions?: ReactNode;
  readonly selected?: boolean;
  readonly testID?: string;
}

/**
 * Shared density card used by Camera Library and Local Library.
 * Visual only — callers supply thumbnail, actions, and press handlers.
 */
export const MediaCard = memo(function MediaCard({
  title,
  whenLabel,
  sizeLabel,
  categoryLabel,
  categoryAccent,
  durationLabel,
  thumbnail,
  thumbnailOverlay,
  onThumbPress,
  thumbAccessibilityLabel,
  onBodyPress,
  bodyAccessibilityLabel,
  actions,
  selected = false,
  testID,
}: MediaCardProps) {
  const { colors, radius } = useAppTheme();

  return (
    <Card
      testID={testID}
      style={[
        styles.card,
        {
          padding: MEDIA_CARD_PADDING,
          borderRadius: radius.md,
          borderColor: selected ? colors.brand : colors.border,
          borderWidth: selected ? 1.5 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View style={styles.row}>
        <Pressable
          onPress={onThumbPress}
          disabled={!onThumbPress}
          accessibilityRole={onThumbPress ? "button" : undefined}
          accessibilityLabel={thumbAccessibilityLabel}
          style={({ pressed }) => [
            styles.thumbPress,
            { opacity: pressed && onThumbPress ? 0.82 : 1 },
          ]}
        >
          {thumbnail}
          {thumbnailOverlay}
          {durationLabel ? (
            <View
              pointerEvents="none"
              style={[styles.durationBadge, { backgroundColor: colors.bg }]}
            >
              <Text style={[styles.durationText, { color: colors.text }]}>{durationLabel}</Text>
            </View>
          ) : null}
        </Pressable>

        <Pressable
          onPress={onBodyPress}
          disabled={!onBodyPress}
          accessibilityRole={onBodyPress ? "button" : undefined}
          accessibilityLabel={bodyAccessibilityLabel}
          style={styles.body}
        >
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          {whenLabel ? (
            <Text style={[styles.metaLine, { color: colors.textMuted }]} numberOfLines={1}>
              {whenLabel}
            </Text>
          ) : null}
          <Text style={[styles.metaLine, { color: colors.textMuted }]} numberOfLines={1}>
            {sizeLabel}
          </Text>
        </Pressable>

        <View style={styles.side}>
          <View
            style={[styles.typeBadge, { backgroundColor: categoryAccent + "22" }]}
            accessibilityLabel={categoryLabel}
          >
            <Text style={[styles.typeBadgeText, { color: categoryAccent }]}>{categoryLabel}</Text>
          </View>
          {actions}
        </View>
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: "100%",
    alignSelf: "stretch",
    minWidth: 0,
    overflow: "hidden",
    minHeight: 104,
  },
  row: {
    width: "100%",
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: MEDIA_CARD_GAP,
  },
  thumbPress: {
    width: MEDIA_THUMB_W,
    height: MEDIA_THUMB_H,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    flexShrink: 0,
  },
  durationBadge: {
    position: "absolute",
    right: 4,
    bottom: 4,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    opacity: 0.88,
  },
  durationText: { fontSize: 10, fontFamily: Type.monoMed },
  body: { flex: 1, minWidth: 0, justifyContent: "center" },
  name: { fontFamily: Type.fontSemi, fontSize: 13, lineHeight: 17 },
  metaLine: { fontSize: 12, fontFamily: Type.font, marginTop: 2, lineHeight: 16 },
  side: { alignItems: "flex-end", justifyContent: "center", gap: 6, flexShrink: 0 },
  typeBadge: {
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignSelf: "flex-end",
    minHeight: MEDIA_CATEGORY_BADGE_MIN_H,
    justifyContent: "center",
  },
  typeBadgeText: { fontSize: 10, fontFamily: Type.fontSemi, letterSpacing: 0.3 },
});

export const mediaCardActionHitStyle = {
  width: MEDIA_ACTION_HIT,
  height: MEDIA_ACTION_HIT,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};
