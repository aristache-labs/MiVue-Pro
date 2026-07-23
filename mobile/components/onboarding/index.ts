export type { OnboardingState, OnboardingStep, CameraProfile, VerifyUiState, VerifyResult } from "./onboardingTypes";
export {
  ONBOARDING_SCHEMA_VERSION,
  TERMS_VERSION,
  ONBOARDING_STORAGE_KEY,
  DEFAULT_ONBOARDING_STATE,
} from "./onboardingTypes";
export {
  CAMERA_PROFILES,
  getCameraProfile,
  canStartConnection,
  compatibilityBadgeLabel,
  activeConnectionMethods,
  CONNECTION_METHOD_ENABLED,
} from "./cameraProfiles";
export {
  needsTermsAcceptance,
  resolveInitialStep,
  acceptTerms,
  skipCameraSetup,
  selectCameraProfile,
  markPrePromptSeen,
  markConnecting,
  markConnectionGuide,
  markSuccess,
  completeOnboarding,
  changeCamera,
  resetOnboarding,
  continueEnabled,
  isOnboardingGateActive,
  safeResumeStep,
} from "./onboardingMachine";
export {
  parseOnboardingState,
  loadOnboardingState,
  saveOnboardingState,
  clearOnboardingState,
} from "./onboardingStore";
export {
  LEGAL_DRAFT_BANNER,
  LEGAL_PLACEHOLDERS,
  TERMS_SUMMARY,
  PRIVACY_SUMMARY,
  PRIVACY_SUMMARY_ROWS,
  TERMS_CHECKBOX_LABEL,
  TERMS_OF_USE_TITLE,
  PRIVACY_POLICY_TITLE,
  TERMS_OF_USE_DOCUMENT,
  PRIVACY_POLICY_DOCUMENT,
  currentTermsVersion,
  getLegalDocument,
} from "./legalContent";
export type { LegalDocument, LegalDocumentSection, PrivacySummaryRow } from "./legalContent";
export {
  verifyCameraConnection,
  canStartVerify,
  looksLikeHtmlOrCaptivePortal,
  classifyVerifyError,
  shouldConfirmModelMismatch,
  VERIFY_IN_PROGRESS,
  __resetVerifyGateForTests,
} from "./verifyCamera";
export {
  shouldRunAppStateVerify,
  scheduleOneShotVerify,
  APP_STATE_VERIFY_DEBOUNCE_MS,
} from "./appStateVerify";
export {
  ensureAddOnlyPhotosPermission,
  PHOTOS_PERMISSION_ONBOARDING_POLICY,
  NOTIFICATIONS_ONBOARDING_POLICY,
} from "./mediaPermissions";
export {
  userFacingConnectionError,
  isCameraConnectionUnavailableState,
  shouldAllowGateBypassSegment,
} from "./connectionErrors";
export { OnboardingLayout } from "./onboardingLayout";
