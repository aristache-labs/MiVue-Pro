/**
 * Photos permission helper for a future “Save to Photos” action.
 * Must NOT be imported by onboarding screens or OnboardingProvider.
 *
 * Laneory keeps downloads in private app storage by default.
 * When Save to Photos is implemented, call ensureAddOnlyPhotosPermission()
 * only after an explicit user action — never at startup or during onboarding.
 */

export type PhotosPermissionResult =
  | { readonly status: "granted" }
  | { readonly status: "denied" }
  | { readonly status: "unavailable"; readonly reason: string };

/**
 * Placeholder: no MediaLibrary dependency yet.
 * Returns unavailable so callers fall back to the system share sheet.
 */
export async function ensureAddOnlyPhotosPermission(): Promise<PhotosPermissionResult> {
  return {
    status: "unavailable",
    reason:
      "Save to Photos is not wired yet. Use Share to export a file without granting library access.",
  };
}

/** Contract used by tests — onboarding must never request photos. */
export const PHOTOS_PERMISSION_ONBOARDING_POLICY = "never_at_startup_or_onboarding" as const;

/** Notifications are never requested during onboarding. */
export const NOTIFICATIONS_ONBOARDING_POLICY = "never_in_onboarding" as const;
