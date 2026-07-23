/**
 * Camera software / network identity for Settings → Camera & Connection.
 *
 * Live MiVue 866 (2026-07-24): confirmed read-only CGI keys below via GET
 * Config.cgi on an owned camera (see docs/protocol.md). Demo Mode uses
 * synthetic samples only and never feeds the live path. Never invent keys.
 */

export type SoftwareFieldState =
  | "loading"
  | "available"
  | "unavailable"
  | "not_reported"
  | "ssid_unavailable"
  | "disconnected"
  | "error";

export type SoftwareFieldKey =
  | "cameraWifi"
  | "firmware"
  | "safetyCameraData"
  | "voicePackage";

export type SoftwareFieldView = {
  readonly key: SoftwareFieldKey;
  readonly state: SoftwareFieldState;
  readonly display: string;
  readonly raw?: string;
  readonly source: "cgi" | "os" | "demo" | "none";
  readonly accessibilityHint?: string;
};

/** Synthetic Demo Mode samples — never used as live-camera fallback. */
export const DEMO_CAMERA_SOFTWARE = Object.freeze({
  firmware: "VI100.24.50.BE1WD.10",
  safetyCameraData: "V82.0706.01.25",
  voiceLanguage: "Romanian",
  voiceVersion: "V01.0829.01.RO",
  cameraWifiSsid: "MiVue_db:8c",
});

/**
 * CGI keys confirmed live on owned MiVue 866 (GET only, 2026-07-24).
 * Fetch only these exact names — never Net.* wildcards (Wi-Fi secrets).
 */
export const CAMERA_SOFTWARE_CGI_KEYS = Object.freeze({
  firmware: ["Vendor.DeviceInfo.Version.Firmware"] as readonly string[],
  safetyCameraData: ["Vendor.DeviceInfo.Version.SpeedCam"] as readonly string[],
  voiceVersion: ["Vendor.DeviceInfo.Version.Voice"] as readonly string[],
  voiceLanguage: [] as readonly string[],
  cameraWifiSsid: ["Net.WIFI_AP.SSID"] as readonly string[],
});

export const NOT_REPORTED_BY_CAMERA = "Not reported by camera";
export const SSID_UNAVAILABLE = "SSID unavailable";
export const CAMERA_DISCONNECTED = "Camera disconnected";
export const LOADING_DISPLAY = "Loading…";

export const NOT_REPORTED_A11Y_HINT =
  "The connected camera model does not report this information over its read-only interface.";

export const CAMERA_UPDATE_INFO_KIND = ["firmware", "safety", "voice"] as const;
export type CameraUpdateInfoKind = (typeof CAMERA_UPDATE_INFO_KIND)[number];

export const CAMERA_UPDATE_INFO_TITLE: Readonly<Record<CameraUpdateInfoKind, string>> =
  Object.freeze({
    firmware: "Firmware update",
    safety: "Safety camera data",
    voice: "Voice package",
  });

/**
 * Official Mio HTTPS URLs for update instructions.
 * Leave undefined until a documented, approved URL exists — never invent hosts.
 */
export const OFFICIAL_CAMERA_UPDATE_URLS: Readonly<
  Record<CameraUpdateInfoKind, string | undefined>
> = Object.freeze({
  firmware: undefined,
  safety: undefined,
  voice: undefined,
});

export function isApprovedHttpsUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function formatVoicePackageDisplay(
  language: string | undefined,
  version: string | undefined,
): string | undefined {
  const lang = language?.trim();
  const ver = version?.trim();
  if (lang && ver) return `${lang} · ${ver}`;
  if (ver) return ver;
  if (lang) return lang;
  return undefined;
}

export function normalizeWifiSsid(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  let value = raw.trim();
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1).trim();
  }
  const lower = value.toLowerCase();
  if (!value || lower === "<unknown ssid>" || lower === "0x" || lower === "null") {
    return undefined;
  }
  return value;
}

function firstProperty(
  properties: Readonly<Record<string, string>>,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const value = properties[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

export type WifiSsidRead = {
  readonly ssid: string | undefined;
  readonly status: "available" | "unavailable" | "permission_denied" | "unsupported";
};

export function resolveCameraWifiDisplay(input: {
  readonly connected: boolean;
  readonly ssid: string | undefined;
  readonly demoMode: boolean;
  readonly ssidStatus?: WifiSsidRead["status"];
  /** Prefer camera CGI SSID when present; OS is fallback only. */
  readonly ssidSource?: "cgi" | "os";
}): SoftwareFieldView {
  if (input.demoMode) {
    return {
      key: "cameraWifi",
      state: "available",
      display: DEMO_CAMERA_SOFTWARE.cameraWifiSsid,
      raw: DEMO_CAMERA_SOFTWARE.cameraWifiSsid,
      source: "demo",
    };
  }
  if (!input.connected) {
    return {
      key: "cameraWifi",
      state: "disconnected",
      display: "Unavailable",
      source: "none",
    };
  }
  const ssid = normalizeWifiSsid(input.ssid);
  if (ssid) {
    return {
      key: "cameraWifi",
      state: "available",
      display: ssid,
      raw: ssid,
      source: input.ssidSource === "cgi" ? "cgi" : "os",
    };
  }
  return {
    key: "cameraWifi",
    state: "ssid_unavailable",
    display: SSID_UNAVAILABLE,
    source: "none",
    accessibilityHint:
      "The camera did not report an SSID and the operating system did not provide one. On iPhone, OS fallback usually requires When-In-Use location access and a development build with Wi‑Fi Information entitlement.",
  };
}

function resolveCgiOrDemoField(input: {
  readonly key: Exclude<SoftwareFieldKey, "cameraWifi">;
  readonly connected: boolean;
  readonly demoMode: boolean;
  readonly loading: boolean;
  readonly properties: Readonly<Record<string, string>>;
  readonly demoValue: string;
  readonly cgiKeys: readonly string[];
  readonly lastConfirmed?: string;
  readonly requestError?: boolean;
}): SoftwareFieldView {
  if (input.demoMode) {
    return {
      key: input.key,
      state: "available",
      display: input.demoValue,
      raw: input.demoValue,
      source: "demo",
    };
  }
  if (!input.connected) {
    return {
      key: input.key,
      state: "disconnected",
      display: CAMERA_DISCONNECTED,
      source: "none",
    };
  }
  if (input.loading) {
    const previous =
      firstProperty(input.properties, input.cgiKeys) ?? input.lastConfirmed?.trim();
    if (previous) {
      return {
        key: input.key,
        state: "loading",
        display: previous,
        raw: previous,
        source: "cgi",
      };
    }
    return {
      key: input.key,
      state: "loading",
      display: LOADING_DISPLAY,
      source: "none",
    };
  }
  if (input.requestError) {
    const previous =
      firstProperty(input.properties, input.cgiKeys) ?? input.lastConfirmed?.trim();
    if (previous) {
      return {
        key: input.key,
        state: "error",
        display: previous,
        raw: previous,
        source: "cgi",
        accessibilityHint: "Last confirmed value shown after a temporary refresh error.",
      };
    }
    return {
      key: input.key,
      state: "error",
      display: "Temporarily unavailable",
      source: "none",
    };
  }
  if (input.cgiKeys.length === 0) {
    return {
      key: input.key,
      state: "not_reported",
      display: NOT_REPORTED_BY_CAMERA,
      source: "none",
      accessibilityHint: NOT_REPORTED_A11Y_HINT,
    };
  }
  const raw = firstProperty(input.properties, input.cgiKeys);
  if (raw) {
    return {
      key: input.key,
      state: "available",
      display: raw,
      raw,
      source: "cgi",
    };
  }
  return {
    key: input.key,
    state: "not_reported",
    display: NOT_REPORTED_BY_CAMERA,
    source: "none",
    accessibilityHint: NOT_REPORTED_A11Y_HINT,
  };
}

export function resolveVoicePackageField(input: {
  readonly connected: boolean;
  readonly demoMode: boolean;
  readonly loading: boolean;
  readonly properties: Readonly<Record<string, string>>;
  readonly cgiKeys?: {
    readonly voiceVersion?: readonly string[];
    readonly voiceLanguage?: readonly string[];
  };
  readonly lastConfirmed?: string;
  readonly requestError?: boolean;
}): SoftwareFieldView {
  const voiceLanguageKeys =
    input.cgiKeys?.voiceLanguage ?? CAMERA_SOFTWARE_CGI_KEYS.voiceLanguage;
  const voiceVersionKeys = input.cgiKeys?.voiceVersion ?? CAMERA_SOFTWARE_CGI_KEYS.voiceVersion;

  if (input.demoMode) {
    const display = formatVoicePackageDisplay(
      DEMO_CAMERA_SOFTWARE.voiceLanguage,
      DEMO_CAMERA_SOFTWARE.voiceVersion,
    )!;
    return {
      key: "voicePackage",
      state: "available",
      display,
      raw: display,
      source: "demo",
    };
  }
  if (!input.connected) {
    return {
      key: "voicePackage",
      state: "disconnected",
      display: CAMERA_DISCONNECTED,
      source: "none",
    };
  }
  if (input.loading) {
    const language = firstProperty(input.properties, voiceLanguageKeys);
    const version = firstProperty(input.properties, voiceVersionKeys);
    const display =
      formatVoicePackageDisplay(language, version) ?? input.lastConfirmed?.trim();
    if (display) {
      return {
        key: "voicePackage",
        state: "loading",
        display,
        raw: display,
        source: "cgi",
      };
    }
    return {
      key: "voicePackage",
      state: "loading",
      display: LOADING_DISPLAY,
      source: "none",
    };
  }
  if (input.requestError) {
    if (input.lastConfirmed?.trim()) {
      return {
        key: "voicePackage",
        state: "error",
        display: input.lastConfirmed.trim(),
        raw: input.lastConfirmed.trim(),
        source: "cgi",
      };
    }
    return {
      key: "voicePackage",
      state: "error",
      display: "Temporarily unavailable",
      source: "none",
    };
  }
  if (voiceLanguageKeys.length === 0 && voiceVersionKeys.length === 0) {
    return {
      key: "voicePackage",
      state: "not_reported",
      display: NOT_REPORTED_BY_CAMERA,
      source: "none",
      accessibilityHint: NOT_REPORTED_A11Y_HINT,
    };
  }
  const language = firstProperty(input.properties, voiceLanguageKeys);
  const version = firstProperty(input.properties, voiceVersionKeys);
  const display = formatVoicePackageDisplay(language, version);
  if (display) {
    return {
      key: "voicePackage",
      state: "available",
      display,
      raw: display,
      source: "cgi",
    };
  }
  return {
    key: "voicePackage",
    state: "not_reported",
    display: NOT_REPORTED_BY_CAMERA,
    source: "none",
    accessibilityHint: NOT_REPORTED_A11Y_HINT,
  };
}

export function resolveCameraSoftwareFields(input: {
  readonly connected: boolean;
  readonly demoMode: boolean;
  readonly loading: boolean;
  readonly properties: Readonly<Record<string, string>>;
  readonly wifiSsid: string | undefined;
  readonly wifiSsidStatus?: WifiSsidRead["status"];
  readonly requestError?: boolean;
  readonly lastConfirmed?: Partial<Record<Exclude<SoftwareFieldKey, "cameraWifi">, string>>;
  /** Test / future confirmation only — never invent production CGI names. */
  readonly cgiKeys?: {
    readonly firmware?: readonly string[];
    readonly safetyCameraData?: readonly string[];
    readonly voiceVersion?: readonly string[];
    readonly voiceLanguage?: readonly string[];
    readonly cameraWifiSsid?: readonly string[];
  };
}): Readonly<Record<SoftwareFieldKey, SoftwareFieldView>> {
  const cgiKeys = {
    firmware: input.cgiKeys?.firmware ?? CAMERA_SOFTWARE_CGI_KEYS.firmware,
    safetyCameraData: input.cgiKeys?.safetyCameraData ?? CAMERA_SOFTWARE_CGI_KEYS.safetyCameraData,
    voiceVersion: input.cgiKeys?.voiceVersion ?? CAMERA_SOFTWARE_CGI_KEYS.voiceVersion,
    voiceLanguage: input.cgiKeys?.voiceLanguage ?? CAMERA_SOFTWARE_CGI_KEYS.voiceLanguage,
    cameraWifiSsid: input.cgiKeys?.cameraWifiSsid ?? CAMERA_SOFTWARE_CGI_KEYS.cameraWifiSsid,
  };
  const cgiSsid = firstProperty(input.properties, cgiKeys.cameraWifiSsid);
  return {
    cameraWifi: resolveCameraWifiDisplay({
      connected: input.connected,
      ssid: cgiSsid ?? input.wifiSsid,
      demoMode: input.demoMode,
      ssidStatus: input.wifiSsidStatus,
      ssidSource: cgiSsid ? "cgi" : "os",
    }),
    firmware: resolveCgiOrDemoField({
      key: "firmware",
      connected: input.connected,
      demoMode: input.demoMode,
      loading: input.loading,
      properties: input.properties,
      demoValue: DEMO_CAMERA_SOFTWARE.firmware,
      cgiKeys: cgiKeys.firmware,
      lastConfirmed: input.lastConfirmed?.firmware,
      requestError: input.requestError,
    }),
    safetyCameraData: resolveCgiOrDemoField({
      key: "safetyCameraData",
      connected: input.connected,
      demoMode: input.demoMode,
      loading: input.loading,
      properties: input.properties,
      demoValue: DEMO_CAMERA_SOFTWARE.safetyCameraData,
      cgiKeys: cgiKeys.safetyCameraData,
      lastConfirmed: input.lastConfirmed?.safetyCameraData,
      requestError: input.requestError,
    }),
    voicePackage: resolveVoicePackageField({
      connected: input.connected,
      demoMode: input.demoMode,
      loading: input.loading,
      properties: input.properties,
      cgiKeys,
      lastConfirmed: input.lastConfirmed?.voicePackage,
      requestError: input.requestError,
    }),
  };
}
