import { TERMS_VERSION } from "./onboardingTypes";

export const LEGAL_DRAFT_BANNER = "DRAFT · Legal review required";

export const TERMS_OF_USE_TITLE = "Terms of Use";
export const PRIVACY_POLICY_TITLE = "Privacy Policy";

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

/** Full Terms of Use draft — opened from “Read Terms of Use”. */
export const TERMS_SUMMARY = [
  LEGAL_DRAFT_BANNER,
  "",
  "Laneory is a local-first companion for dashcams you own or are authorized to access.",
  "The app lists and downloads recordings you choose over the camera’s local Wi‑Fi using read-only requests.",
  "Laneory does not change camera settings, delete camera files, format storage, or update firmware.",
  "Downloaded media stays in Laneory’s private app storage until you export or share it.",
  "There is no Laneory account required for basic use in this draft.",
  "",
  "Laneory is an independent app and is not affiliated with Mio or MiTAC.",
].join("\n");

export const PRIVACY_SUMMARY = [
  LEGAL_DRAFT_BANNER,
  "",
  "Laneory is designed to keep camera media and GPS sidecars on your devices.",
  "Connection to the dashcam uses your phone’s local network. Video and GPS from that link are not uploaded by Laneory as part of the connection itself.",
  "Laneory does not ask for your camera Wi‑Fi password and does not store it.",
  "Optional online map tiles (if you enable them later) are loaded by your device from public tile providers; that is separate from camera connection.",
  "Diagnostics you export are sanitized to reduce accidental secrets.",
  "",
  "This text is a product draft, not an approved privacy policy.",
].join("\n");

export const TERMS_CHECKBOX_LABEL = "I agree to the Terms of Use and Privacy Policy.";

export function currentTermsVersion(): string {
  return TERMS_VERSION;
}
