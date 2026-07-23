import { TERMS_VERSION } from "./onboardingTypes";

export const LEGAL_DRAFT_BANNER = "DRAFT · Legal review required";

export const TERMS_OF_USE_TITLE = "Terms of Use";
export const PRIVACY_POLICY_TITLE = "Privacy Policy";

/** Detectable placeholders that require owner / counsel completion before release. */
export const LEGAL_PLACEHOLDERS = Object.freeze([
  "[LEGAL ENTITY NAME]",
  "[REGISTERED ADDRESS]",
  "[LEGAL CONTACT EMAIL]",
  "[PRIVACY CONTACT EMAIL]",
  "[GOVERNING LAW]",
  "[COMPETENT COURTS]",
  "[SUPERVISORY AUTHORITY / TERRITORY]",
  "[PROVIDER PLACEHOLDER]",
] as const);

export type PrivacySummaryRow = {
  readonly icon: "wifi-outline" | "folder-outline" | "lock-closed-outline" | "ribbon-outline";
  readonly title: string;
  readonly body: string;
};

export const PRIVACY_SUMMARY_ROWS: readonly PrivacySummaryRow[] = Object.freeze([
  {
    icon: "wifi-outline",
    title: "Direct camera connection",
    body: "Laneory communicates with your dashcam over its local Wi-Fi.",
  },
  {
    icon: "folder-outline",
    title: "Private storage",
    body: "Downloads remain in Laneory until you export or delete them.",
  },
  {
    icon: "lock-closed-outline",
    title: "Read-only camera access",
    body: "Laneory does not change settings or delete camera recordings.",
  },
  {
    icon: "ribbon-outline",
    title: "Independent application",
    body: "Laneory is not affiliated with Mio or MiTAC.",
  },
]);

export interface LegalDocumentSection {
  readonly title: string;
  readonly paragraphs?: readonly string[];
  readonly bullets?: readonly string[];
}

export interface LegalDocument {
  readonly title: string;
  readonly status: "draft";
  readonly version: string;
  readonly effectiveDate: string;
  readonly sections: readonly LegalDocumentSection[];
}

const TERMS_EFFECTIVE_DATE = "2026-07-23 (draft — subject to legal review)";
const PRIVACY_EFFECTIVE_DATE = "2026-07-23 (draft — subject to legal review)";

export const TERMS_OF_USE_DOCUMENT: LegalDocument = Object.freeze({
  title: TERMS_OF_USE_TITLE,
  status: "draft",
  version: TERMS_VERSION,
  effectiveDate: TERMS_EFFECTIVE_DATE,
  sections: Object.freeze([
    Object.freeze({
      title: "1. About these Terms",
      paragraphs: Object.freeze([
        "These Terms of Use (“Terms”) govern your use of the Laneory mobile application (“Laneory”, “the app”).",
        `Document version: ${TERMS_VERSION}. Effective date (draft): ${TERMS_EFFECTIVE_DATE}.`,
        "Provider: [PROVIDER PLACEHOLDER] operating as [LEGAL ENTITY NAME]. Registered address: [REGISTERED ADDRESS].",
        "This document is a product draft and requires legal review before store release. It is not final and has not completed legal certification.",
      ]),
    }),
    Object.freeze({
      title: "2. Eligibility and acceptance",
      paragraphs: Object.freeze([
        "You must have the legal capacity required in your place of residence to enter into these Terms.",
        "By tapping to agree during onboarding (or when a new Terms version is presented), you accept these Terms.",
        "Acknowledging the Privacy Policy does not by itself create a separate contract and is not treated as a universal consent for every processing activity. Legal bases for processing, where required, must be determined with counsel for the final release.",
      ]),
    }),
    Object.freeze({
      title: "3. Licence",
      paragraphs: Object.freeze([
        "Subject to these Terms, Laneory grants you a personal, limited, revocable, non-exclusive licence to install and use the app for lawful purposes.",
        "The licence covers use with dashcams that you own or are authorized to control. It does not authorize access to cameras or recordings belonging to others without permission.",
      ]),
    }),
    Object.freeze({
      title: "4. Permitted use",
      paragraphs: Object.freeze(["You may use Laneory to:"]),
      bullets: Object.freeze([
        "Connect to a supported dashcam over its local Wi-Fi network.",
        "List recordings and related metadata available from the camera.",
        "Download recordings you choose to private app storage.",
        "Play back downloaded video and photos.",
        "Read GPS/NMEA sidecar data associated with recordings where available.",
        "Share or export files you initiate through the system share sheet or comparable export flows.",
      ]),
    }),
    Object.freeze({
      title: "5. Prohibited use",
      paragraphs: Object.freeze([
        "You must not use Laneory to access cameras or recordings without authorization, to violate the rights of others, or to use recordings unlawfully.",
        "You must not reverse engineer Laneory services where such activity is prohibited by applicable law, or use the app in a way that disrupts the camera, local network, or map tile services.",
        "Nothing in these Terms asserts that camera interoperability has already received legal clearance for every jurisdiction or use case. Compliance with local law remains your responsibility.",
      ]),
    }),
    Object.freeze({
      title: "6. Camera access",
      paragraphs: Object.freeze([
        "The mobile product is designed for read-only camera access using HTTP GET and HEAD requests only.",
        "Laneory does not change camera settings, delete files on the camera, format the SD card, or update camera firmware through the app.",
      ]),
    }),
    Object.freeze({
      title: "7. Local storage and exports",
      paragraphs: Object.freeze([
        "Downloaded files remain in Laneory’s private application storage on your device until you delete them or uninstall the app (subject to operating-system behaviour).",
        "You control deletion and export. After you export or share a file, the destination app or service applies its own policies to that copy.",
      ]),
    }),
    Object.freeze({
      title: "8. GPS, video and personal data responsibilities",
      paragraphs: Object.freeze([
        "Dashcam recordings and GPS tracks may contain faces, vehicle registration plates, precise locations, and other personal data.",
        "You are responsible for using, retaining, and distributing that material in accordance with applicable law and the rights of others.",
      ]),
    }),
    Object.freeze({
      title: "9. Online maps",
      paragraphs: Object.freeze([
        "When you select Online map, Laneory displays map tiles using Leaflet with OpenStreetMap raster tiles (or another tile provider configured for a future build).",
        "Online map availability is best-effort. Attribution required by the tile provider must be shown.",
        "Use of online maps is subject to the tile provider’s terms and privacy practices. Laneory does not warrant map accuracy or continuous availability.",
        "Online maps are not intended for turn-by-turn navigation or safety-critical use.",
      ]),
    }),
    Object.freeze({
      title: "10. Compatibility",
      paragraphs: Object.freeze([
        "Compatibility may vary by camera model, firmware, and configuration.",
        "References to Mio or MiVue are factual descriptions of supported or tested hardware where applicable. Laneory is an independent application and is not affiliated with Mio or MiTAC.",
      ]),
    }),
    Object.freeze({
      title: "11. App updates",
      paragraphs: Object.freeze([
        "Laneory may receive updates through the configured update infrastructure (including Expo/EAS Updates where enabled).",
        "Features may evolve over time. Material changes to these Terms require a new Terms version and renewed acceptance before continued use under the updated Terms.",
      ]),
    }),
    Object.freeze({
      title: "12. Third-party services and licences",
      paragraphs: Object.freeze([
        "Laneory may rely on OpenStreetMap tiles, open-source components, Apple and Google platform services, and third-party apps you choose for share or export.",
        "Those third parties are governed by their own terms and privacy notices.",
      ]),
    }),
    Object.freeze({
      title: "13. Availability and warranties",
      paragraphs: Object.freeze([
        "Laneory is provided on a prudent, as-available basis for a draft product, subject to mandatory consumer rights that cannot be excluded under applicable law.",
        "Nothing in these Terms excludes rights that cannot lawfully be excluded.",
      ]),
    }),
    Object.freeze({
      title: "14. Limitation of liability",
      paragraphs: Object.freeze([
        "[Limitation of liability — to be completed by counsel for [LEGAL ENTITY NAME].]",
        "This draft does not assert absolute exclusions that have not been legally validated. Mandatory applicable rights are preserved.",
      ]),
    }),
    Object.freeze({
      title: "15. Suspension and termination",
      paragraphs: Object.freeze([
        "You may stop using Laneory at any time by uninstalling the app.",
        "Local downloads stored only in the app may be removed by uninstall or by using in-app deletion, subject to operating-system and backup behaviour that must be verified before release.",
      ]),
    }),
    Object.freeze({
      title: "16. Governing law and disputes",
      paragraphs: Object.freeze([
        "Governing law: [GOVERNING LAW]. Competent courts: [COMPETENT COURTS].",
        "Mandatory consumer rights available in your place of residence are preserved. This clause requires legal completion before release.",
      ]),
    }),
    Object.freeze({
      title: "17. Contact",
      paragraphs: Object.freeze([
        "Legal entity: [LEGAL ENTITY NAME].",
        "Registered address: [REGISTERED ADDRESS].",
        "Legal contact email: [LEGAL CONTACT EMAIL].",
      ]),
    }),
  ]),
});

export const PRIVACY_POLICY_DOCUMENT: LegalDocument = Object.freeze({
  title: PRIVACY_POLICY_TITLE,
  status: "draft",
  version: TERMS_VERSION,
  effectiveDate: PRIVACY_EFFECTIVE_DATE,
  sections: Object.freeze([
    Object.freeze({
      title: "1. Identity and scope",
      paragraphs: Object.freeze([
        "This Privacy Policy describes how the Laneory mobile application processes information.",
        "Controller / operator: [LEGAL ENTITY NAME] (placeholder — confirm roles with privacy counsel). Registered address: [REGISTERED ADDRESS].",
        `Document version: ${TERMS_VERSION}. Effective date (draft): ${PRIVACY_EFFECTIVE_DATE}.`,
        "This document is a product draft requiring legal review. It is not final and has not completed legal certification.",
      ]),
    }),
    Object.freeze({
      title: "2. Product architecture",
      paragraphs: Object.freeze([
        "Laneory is designed as a local-first companion: camera media and GPS sidecars are intended to stay on your devices unless you export them.",
        "The current draft does not require a Laneory account.",
        "Subject to a final build audit, the current product intent is not to include analytics SDKs, advertising SDKs, or automatic crash-upload services. Do not read this as a blanket statement that “no data is collected”: local processing and limited third-party technical requests (for example online map tiles and update checks) still occur as described below.",
      ]),
    }),
    Object.freeze({
      title: "3. Data processed locally",
      paragraphs: Object.freeze(["Depending on use, Laneory may process on device:"]),
      bullets: Object.freeze([
        "Camera IP address and model hints.",
        "Connection status and error messages.",
        "File lists and media metadata from the camera.",
        "Downloaded videos and photos.",
        "NMEA/GPS sidecar samples associated with recordings.",
        "Thumbnails and cache files.",
        "Download queue state.",
        "Map preference (online vs local schematic).",
        "Accepted Terms version and acceptance timestamp.",
      ]),
    }),
    Object.freeze({
      title: "4. Camera connection",
      paragraphs: Object.freeze([
        "The camera is reached over the phone’s local Wi-Fi network using limited cleartext HTTP to the camera.",
        "Requests are GET/HEAD read-only. Laneory does not ask for or store the camera Wi-Fi password.",
      ]),
    }),
    Object.freeze({
      title: "5. Local media storage",
      paragraphs: Object.freeze([
        "Downloaded media is stored in private app storage.",
        "Retention lasts until you delete files, clear applicable caches, uninstall the app, or the operating system removes app data.",
        "Thumbnails, cache entries, and partial downloads may also be stored temporarily.",
        "Backup and restore behaviour (including iCloud/Google backup of app data) must be verified against the final build before release and documented here after that audit.",
      ]),
    }),
    Object.freeze({
      title: "6. Online map",
      paragraphs: Object.freeze([
        "When Online map is selected, Laneory requests visible OpenStreetMap raster tiles (Leaflet WebView).",
        "The tile provider or CDN may receive your device IP address, User-Agent or browser/device information, tile coordinates, and request time. Tile coordinates can approximate the geographic area you view.",
        "Laneory does not upload the video file or the complete GPS track to the map provider as map display files.",
        "The OpenStreetMap Foundation (OSMF) and related CDN operators act as independent providers under their own policies.",
        "Local schematic mode does not request online map tiles.",
      ]),
    }),
    Object.freeze({
      title: "7. Expo/EAS Updates",
      paragraphs: Object.freeze([
        "Laneory is configured with expo-updates and checkAutomatically=\"ON_LOAD\".",
        "On launch (and as configured by Expo), the app may check for updates against Expo’s update infrastructure (currently configured toward u.expo.dev for this project).",
        "Update checks may transmit technical data typically required for update delivery (such as app identifiers, runtime/channel information, and device/platform metadata as implemented by Expo). Exact fields, retention, and international transfers must be confirmed against Expo’s documentation and the final EAS project settings before release.",
        "Purpose: deliver app updates. Provider privacy information: see Expo’s published privacy policy for Expo Application Services / updates.",
        "This section must be re-audited against the production EAS project, channel configuration, and any additional SDKs before store submission.",
      ]),
    }),
    Object.freeze({
      title: "8. User-initiated sharing",
      paragraphs: Object.freeze([
        "When you use the system share sheet or export flows, you choose the destination.",
        "The third-party app or service receives the file you share and applies its own privacy policy after export.",
      ]),
    }),
    Object.freeze({
      title: "9. Permissions",
      paragraphs: Object.freeze([
        "Local network access is used to reach the camera.",
        "Photo library permission is requested only if a final export flow requires it.",
        "Notifications are requested only if notifications are actually implemented in the shipping build.",
        "Laneory does not need phone location permission to read GPS data already embedded in camera recordings or NMEA sidecars.",
        "Permission strings and prompts must match the final build audit.",
      ]),
    }),
    Object.freeze({
      title: "10. Diagnostics",
      paragraphs: Object.freeze([
        "Diagnostics are generated locally and sanitized to reduce accidental secrets (for example passwords, tokens, or private paths).",
        "There is no automatic diagnostics upload in the current draft design. You can view and initiate export of sanitized diagnostics from internal Diagnostics tooling where available.",
        "Exported fields may include app version/build, link state, host, transport mode, timestamps, sanitized errors, local file counts, and map preference.",
      ]),
    }),
    Object.freeze({
      title: "11. Data sharing and third parties",
      paragraphs: Object.freeze([
        "Depending on features you use, third parties may include:",
      ]),
      bullets: Object.freeze([
        "OSMF / OpenStreetMap tile CDN (when Online map is selected).",
        "Expo / EAS Updates infrastructure (update checks).",
        "Apple and Google platform services.",
        "Share/export destinations you choose.",
        "Any additional SDK discovered in a pre-release audit (must be listed before submission).",
      ]),
    }),
    Object.freeze({
      title: "12. Retention and deletion",
      paragraphs: Object.freeze([
        "Local downloads, queue state, thumbnails, and preferences remain on device until deleted, cleared, or removed with the app.",
        "You can delete local files and clear thumbnail cache from in-app controls where provided.",
        "Uninstalling removes app sandbox data subject to OS behaviour.",
        "There is no Laneory account in the current version, and therefore no in-app account deletion flow. Exact retention periods for any remaining server-side update telemetry are those of Expo/EAS and must be confirmed before release.",
      ]),
    }),
    Object.freeze({
      title: "13. Security",
      paragraphs: Object.freeze([
        "Laneory relies on the mobile OS app sandbox, input validation, and HTTPS for external services such as update checks and online tiles.",
        "Camera communication uses limited local cleartext HTTP to the dashcam on the local network.",
        "These measures reduce risk but are not absolute guarantees.",
      ]),
    }),
    Object.freeze({
      title: "14. Legal basis and roles",
      paragraphs: Object.freeze([
        "Legal bases and controller/processor roles for [LEGAL ENTITY NAME] must be completed by counsel / privacy lead before release.",
        "This draft does not automatically treat processing as consent, contract, or legitimate interest.",
        "OSMF and other tile infrastructure may act as independent controllers for their own services.",
      ]),
    }),
    Object.freeze({
      title: "15. International transfers",
      paragraphs: Object.freeze([
        "Update infrastructure and tile CDNs may involve servers outside your country. Transfer mechanisms and destinations require legal verification against the final providers and CDN topology. Placeholder pending counsel review.",
      ]),
    }),
    Object.freeze({
      title: "16. User rights",
      paragraphs: Object.freeze([
        "Depending on applicable law, you may have rights of access, correction, deletion, restriction, objection, and portability.",
        "You may also lodge a complaint with the competent supervisory authority: [SUPERVISORY AUTHORITY / TERRITORY].",
        "Privacy contact: [PRIVACY CONTACT EMAIL]. Entity: [LEGAL ENTITY NAME]. Address: [REGISTERED ADDRESS].",
      ]),
    }),
    Object.freeze({
      title: "17. Children",
      paragraphs: Object.freeze([
        "Intended audience and minimum age must be confirmed by the product owner and counsel before release. This draft does not invent a minimum age threshold.",
      ]),
    }),
    Object.freeze({
      title: "18. Changes",
      paragraphs: Object.freeze([
        "Material changes will be reflected in a new document version and effective date.",
        "Where required, users will be notified in-app and may need to review updated Terms or Privacy text.",
      ]),
    }),
    Object.freeze({
      title: "19. Contact",
      paragraphs: Object.freeze([
        "Legal entity: [LEGAL ENTITY NAME].",
        "Registered address: [REGISTERED ADDRESS].",
        "Privacy contact email: [PRIVACY CONTACT EMAIL].",
        "Supervisory authority / territory: [SUPERVISORY AUTHORITY / TERRITORY].",
        "A public Privacy Policy URL for App Store Connect and Google Play Console must be provided by the owner before store submission. Do not invent a placeholder URL in production listings.",
      ]),
    }),
  ]),
});

function flattenDocument(doc: LegalDocument): string {
  const parts: string[] = [
    LEGAL_DRAFT_BANNER,
    "",
    doc.title,
    `Status: ${doc.status}`,
    `Version: ${doc.version}`,
    `Effective date: ${doc.effectiveDate}`,
    "",
  ];
  for (const section of doc.sections) {
    parts.push(section.title, "");
    if (section.paragraphs) {
      for (const p of section.paragraphs) parts.push(p, "");
    }
    if (section.bullets) {
      for (const b of section.bullets) parts.push(`• ${b}`);
      parts.push("");
    }
  }
  return parts.join("\n").trimEnd();
}

/** Plain-text flatten for tests / fallbacks — structured UI should use the documents. */
export const TERMS_SUMMARY = flattenDocument(TERMS_OF_USE_DOCUMENT);
export const PRIVACY_SUMMARY = flattenDocument(PRIVACY_POLICY_DOCUMENT);

export const TERMS_CHECKBOX_LABEL =
  "I agree to the Terms of Use and acknowledge the Privacy Policy.";

export function currentTermsVersion(): string {
  return TERMS_VERSION;
}

export function getLegalDocument(doc: "terms" | "privacy"): LegalDocument {
  return doc === "privacy" ? PRIVACY_POLICY_DOCUMENT : TERMS_OF_USE_DOCUMENT;
}
