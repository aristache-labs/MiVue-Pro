import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  ABOUT_LEGAL_REVIEW_NOTE,
  ABOUT_SHEET_SECTIONS,
  DISCLAIMER_SHEET_SECTIONS,
  LICENSES_INTRO,
  MAP_ATTRIBUTION_LINES,
  type AboutLegalSection,
} from "@/components/settings/aboutLegalContent";
import { StaticBackdropSheet } from "@/components/media/StaticBackdropSheet";
import { MEDIA_SHEET_RADIUS } from "@/components/media/mediaCardTokens";
import { CompactSheetHeader, SHEET_BODY_PAD_TOP } from "@/components/sheets/SheetHeader";
import { Type, useAppTheme } from "@/constants/Theme";
import {
  thirdPartyLicenses,
  type ThirdPartyLicensePackage,
} from "@/generated/thirdPartyLicenses";

export type LegalInfoSheetKind = "about" | "disclaimer" | "licenses";

type LegalInfoSheetProps = {
  readonly kind: LegalInfoSheetKind | null;
  readonly onClose: () => void;
  readonly appVersion: string;
  readonly buildLabel?: string;
};

function SectionBlocks({ sections }: { readonly sections: readonly AboutLegalSection[] }) {
  const { colors } = useAppTheme();
  return (
    <>
      {sections.map((section) => (
        <View key={section.title} style={styles.sectionBlock}>
          <Text
            style={[styles.sectionTitle, { color: colors.text }]}
            accessibilityRole="header"
            maxFontSizeMultiplier={1.4}
          >
            {section.title}
          </Text>
          {section.paragraphs.map((paragraph, index) => (
            <Text
              key={`${section.title}-${index}`}
              style={[styles.sectionBody, { color: colors.text }]}
              maxFontSizeMultiplier={1.4}
            >
              {paragraph}
            </Text>
          ))}
        </View>
      ))}
    </>
  );
}

function LicenseRow({
  item,
  expanded,
  onToggle,
  licenseText,
}: {
  readonly item: ThirdPartyLicensePackage;
  readonly expanded: boolean;
  readonly onToggle: () => void;
  readonly licenseText: string;
}) {
  const { colors, radius } = useAppTheme();
  return (
    <View style={[styles.licenseCard, { borderColor: colors.border, borderRadius: radius.sm }]}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${item.name} ${item.version}, ${item.license}`}
        style={styles.licenseHeader}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.licenseName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.licenseMeta, { color: colors.textMuted }]} numberOfLines={1}>
            {item.version} · {item.license}
          </Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.textMuted}
        />
      </Pressable>
      {expanded ? (
        <Text
          style={[styles.licenseFull, { color: colors.textMuted, borderTopColor: colors.border }]}
          selectable
          maxFontSizeMultiplier={1.3}
        >
          {item.copyright ? `${item.copyright}\n\n` : ""}
          {item.notice ? `NOTICE:\n${item.notice}\n\n` : ""}
          {licenseText}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * About / Disclaimer / Open-source licences bottom sheets for Settings > About Laneory.
 */
export function LegalInfoSheet({ kind, onClose, appVersion, buildLabel }: LegalInfoSheetProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const visible = kind !== null;
  const title =
    kind === "about"
      ? "About"
      : kind === "disclaimer"
        ? "Disclaimer"
        : kind === "licenses"
          ? "Open-source licences"
          : "";

  const filteredLicenses = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = thirdPartyLicenses.packages;
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.license.toLowerCase().includes(q) ||
        p.version.toLowerCase().includes(q),
    );
  }, [query]);

  const renderLicense: ListRenderItem<ThirdPartyLicensePackage> = useCallback(
    ({ item }) => {
      const key = `${item.path}@${item.version}`;
      const text =
        thirdPartyLicenses.licenseTexts[item.licenseTextKey] ??
        `No license text available for ${item.name}.`;
      return (
        <LicenseRow
          item={item}
          expanded={expanded === key}
          onToggle={() => setExpanded((prev) => (prev === key ? null : key))}
          licenseText={text}
        />
      );
    },
    [expanded],
  );

  const handleClose = useCallback(() => {
    setQuery("");
    setExpanded(null);
    onClose();
  }, [onClose]);

  return (
    <StaticBackdropSheet
      visible={visible}
      onClose={handleClose}
      scrimAccessibilityLabel="Close legal information"
      sheetStyle={{
        backgroundColor: colors.surfaceElevated,
        borderColor: colors.border,
        borderTopLeftRadius: MEDIA_SHEET_RADIUS,
        borderTopRightRadius: MEDIA_SHEET_RADIUS,
        height: "90%",
        maxHeight: "90%",
      }}
    >
      {({ requestClose }) => (
        <View style={styles.sheetInner}>
          <CompactSheetHeader
            title={title}
            compact
            showHandle
            dividerInset={0}
            onClose={requestClose}
            closeAccessibilityLabel="Close"
            belowTitle={
              <Text style={[styles.draftBanner, { color: colors.warn }]} maxFontSizeMultiplier={1.3}>
                {ABOUT_LEGAL_REVIEW_NOTE}
              </Text>
            }
          />

          {kind === "licenses" ? (
            <View style={styles.licensesBody}>
              <Text style={[styles.sectionBody, { color: colors.textMuted }]} maxFontSizeMultiplier={1.4}>
                {LICENSES_INTRO}
              </Text>
              <Text style={[styles.metaLine, { color: colors.textMuted }]} maxFontSizeMultiplier={1.3}>
                Inventory for Laneory {thirdPartyLicenses.appVersion} · app {appVersion}
                {buildLabel ? ` (${buildLabel})` : ""} · {thirdPartyLicenses.packageCount} packages
              </Text>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search packages"
                placeholderTextColor={colors.textFaint}
                accessibilityLabel="Search open-source packages"
                style={[
                  styles.search,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceMuted,
                  },
                ]}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />
              <FlatList
                data={filteredLicenses}
                keyExtractor={(item) => `${item.path}@${item.version}`}
                renderItem={renderLicense}
                style={styles.licenseList}
                contentContainerStyle={{
                  paddingBottom: Math.max(insets.bottom, 16),
                  gap: 8,
                }}
                keyboardShouldPersistTaps="handled"
                ListHeaderComponent={
                  <View style={styles.mapBlock}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]} maxFontSizeMultiplier={1.4}>
                      {thirdPartyLicenses.mapAttribution.title}
                    </Text>
                    {MAP_ATTRIBUTION_LINES.map((line) => (
                      <Text
                        key={line}
                        style={[styles.sectionBody, { color: colors.textMuted }]}
                        maxFontSizeMultiplier={1.4}
                      >
                        {line}
                      </Text>
                    ))}
                    {thirdPartyLicenses.blockers.length > 0 ? (
                      <Text
                        style={[styles.blockerNote, { color: colors.warn }]}
                        maxFontSizeMultiplier={1.3}
                      >
                        {thirdPartyLicenses.blockers.length} package(s) have incomplete licence
                        metadata — release blocker until resolved (including http10-tcp).
                      </Text>
                    ) : null}
                  </View>
                }
                ListEmptyComponent={
                  <Text style={[styles.emptySearch, { color: colors.textMuted }]}>
                    No packages match “{query.trim()}”.
                  </Text>
                }
              />
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingTop: SHEET_BODY_PAD_TOP,
                paddingBottom: Math.max(insets.bottom, 20),
                gap: 4,
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {kind === "about" ? (
                <>
                  <SectionBlocks sections={ABOUT_SHEET_SECTIONS} />
                  <Text style={[styles.metaLine, { color: colors.textMuted }]} maxFontSizeMultiplier={1.3}>
                    Version {appVersion}
                    {buildLabel ? ` · Build ${buildLabel}` : ""}
                  </Text>
                </>
              ) : null}
              {kind === "disclaimer" ? <SectionBlocks sections={DISCLAIMER_SHEET_SECTIONS} /> : null}
            </ScrollView>
          )}
        </View>
      )}
    </StaticBackdropSheet>
  );
}

const styles = StyleSheet.create({
  sheetInner: { flex: 1 },
  draftBanner: {
    fontSize: 12,
    fontFamily: Type.fontSemi,
    textAlign: "center",
  },
  scroll: { flex: 1 },
  sectionBlock: { marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontFamily: Type.fontSemi, marginBottom: 6 },
  sectionBody: { fontSize: 14, fontFamily: Type.font, lineHeight: 20, marginBottom: 6 },
  metaLine: { fontSize: 12, fontFamily: Type.mono, marginTop: 8, marginBottom: 4 },
  licensesBody: { flex: 1, paddingHorizontal: 16, gap: 8, paddingTop: SHEET_BODY_PAD_TOP },
  search: {
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    fontFamily: Type.font,
  },
  licenseList: { flex: 1 },
  licenseCard: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  licenseHeader: {
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  licenseName: { fontSize: 14, fontFamily: Type.fontSemi },
  licenseMeta: { fontSize: 12, fontFamily: Type.mono, marginTop: 2 },
  licenseFull: {
    fontSize: 11,
    fontFamily: Type.mono,
    lineHeight: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  mapBlock: { marginBottom: 10, gap: 2 },
  blockerNote: { fontSize: 12, fontFamily: Type.fontSemi, marginTop: 8, lineHeight: 16 },
  emptySearch: { fontSize: 14, fontFamily: Type.font, textAlign: "center", marginTop: 24 },
});
