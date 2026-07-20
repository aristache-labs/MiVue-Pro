import type { CameraProfile, ConnectionMethod } from "./onboardingTypes";

/** Capability flags — only wifi is implemented and shown. */
export const CONNECTION_METHOD_ENABLED: Readonly<Record<ConnectionMethod, boolean>> = Object.freeze({
  wifi: true,
  qr: false,
  bluetooth: false,
});

export function activeConnectionMethods(
  profile: CameraProfile,
): readonly ConnectionMethod[] {
  return profile.connectionMethods.filter((m) => CONNECTION_METHOD_ENABLED[m]);
}

/**
 * Compatibility registry mirror for the app.
 * Source of truth for claims: docs/compatibility.md (MiVue 866 only verified).
 */
export const CAMERA_PROFILES: readonly CameraProfile[] = Object.freeze([
  {
    id: "mivue-866",
    displayName: "Mio MiVue 866",
    compatibility: "verified",
    defaultHost: "192.72.1.1",
    connectionMethods: ["wifi"],
  },
  {
    id: "other-compatible",
    displayName: "Other compatible camera",
    compatibility: "experimental",
    connectionMethods: ["wifi"],
  },
]);

export function getCameraProfile(id: string | undefined): CameraProfile | undefined {
  if (!id) return undefined;
  return CAMERA_PROFILES.find((p) => p.id === id);
}

export function canStartConnection(profile: CameraProfile): boolean {
  return (
    profile.compatibility !== "unsupported" && activeConnectionMethods(profile).length > 0
  );
}

export function compatibilityBadgeLabel(
  compatibility: CameraProfile["compatibility"],
): string {
  switch (compatibility) {
    case "verified":
      return "Verified";
    case "experimental":
      return "Experimental";
    default:
      return "Unsupported";
  }
}
