/**
 * About Laneory — structured legal/product copy for in-app sheets.
 * DRAFT · Legal review required. Not approved legal advice.
 */

export const ABOUT_LEGAL_REVIEW_NOTE = "DRAFT · Legal review required";

export type AboutLegalSection = {
  readonly title: string;
  readonly paragraphs: readonly string[];
};

export const ABOUT_SHEET_SECTIONS: readonly AboutLegalSection[] = Object.freeze([
  Object.freeze({
    title: "What Laneory does",
    paragraphs: Object.freeze([
      "Laneory is a local-first companion for compatible dashcams that you own or are authorised to use.",
      "You can connect directly to the camera’s local Wi-Fi network, list and download recordings, play files saved on this device, view available GPS/NMEA data, and choose an Online map (OpenStreetMap tiles) or a Local schematic map.",
    ]),
  }),
  Object.freeze({
    title: "Read-only by design",
    paragraphs: Object.freeze([
      "Laneory uses GET and HEAD requests when communicating with the camera. Browsing and downloading stay read-only. Camera settings change only when you explicitly select a new value and confirm Apply. Laneory does not delete camera files, format storage cards or install firmware.",
    ]),
  }),
  Object.freeze({
    title: "Storage and privacy",
    paragraphs: Object.freeze([
      "Downloaded recordings remain in Laneory’s private app storage on this device until you export or delete them. Laneory does not upload camera media as part of the local camera connection.",
    ]),
  }),
  Object.freeze({
    title: "Compatibility",
    paragraphs: Object.freeze([
      "Support depends on camera model, firmware and network behaviour. Mio MiVue 866 is referenced only as a tested profile where applicable. Other models remain experimental until verified.",
    ]),
  }),
  Object.freeze({
    title: "Independent product",
    paragraphs: Object.freeze([
      "Laneory is an independent application and is not affiliated with, endorsed by, sponsored by or distributed by Mio or MiTAC. Mio, MiVue and related marks belong to their respective owners.",
    ]),
  }),
]);

export const DISCLAIMER_SHEET_SECTIONS: readonly AboutLegalSection[] = Object.freeze([
  Object.freeze({
    title: "Independent application",
    paragraphs: Object.freeze([
      "Laneory is not affiliated with, endorsed by, sponsored by or distributed by Mio or MiTAC. Mio, MiVue and related marks belong to their respective owners.",
    ]),
  }),
  Object.freeze({
    title: "Compatibility",
    paragraphs: Object.freeze([
      "Compatibility may vary by camera model, firmware and configuration. Features that work on one device may behave differently on another.",
    ]),
  }),
  Object.freeze({
    title: "Authorised use",
    paragraphs: Object.freeze([
      "Use Laneory only with dashcams you own or are authorised to access. Do not use the app to access recordings belonging to others without permission.",
    ]),
  }),
  Object.freeze({
    title: "Safe use",
    paragraphs: Object.freeze([
      "Do not operate Laneory while driving. Interact with the app only when it is safe and lawful to do so.",
    ]),
  }),
  Object.freeze({
    title: "Maps and telemetry",
    paragraphs: Object.freeze([
      "Maps, GPS position, speed, altitude and related telemetry may be incomplete or inaccurate. They are not intended for navigation or safety-critical use.",
    ]),
  }),
  Object.freeze({
    title: "Third-party services",
    paragraphs: Object.freeze([
      "Online map tiles and other networked services may become unavailable. Their availability and accuracy are outside Laneory’s control.",
    ]),
  }),
  Object.freeze({
    title: "Storage and backups",
    paragraphs: Object.freeze([
      "You are responsible for backing up important recordings and for files you export, share or delete. Uninstalling the app may remove locally stored downloads, subject to operating-system behaviour.",
    ]),
  }),
  Object.freeze({
    title: "Legal notice",
    paragraphs: Object.freeze([
      "Nothing in this disclaimer excludes rights that cannot lawfully be excluded under applicable consumer law. This text is not legal advice and requires legal review before commercial release.",
      ABOUT_LEGAL_REVIEW_NOTE,
    ]),
  }),
]);

export const LICENSES_INTRO =
  "Laneory includes open-source components. The inventory below is generated from the production lockfile and license files packaged with those dependencies. Map data attribution is listed separately. This notice requires legal review before store release.";

export const MAP_ATTRIBUTION_LINES = Object.freeze([
  "Map data © OpenStreetMap contributors",
  "Online map UI uses Leaflet loaded from a public CDN when Online map is selected (not an npm package in this app).",
  "Tile requests may reach the configured OpenStreetMap tile CDN. See the Privacy Policy draft for details.",
] as const);
