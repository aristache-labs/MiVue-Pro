import Constants from "expo-constants";
import { Platform } from "react-native";

import type { GpsSample } from "@/packages/parsers/src/index";

export interface MapFollowPose {
  readonly latitude: number;
  readonly longitude: number;
  readonly bearingDeg: number;
  readonly zoom: number;
  readonly index: number;
  readonly following: boolean;
}

export interface GoogleRecordedRouteMapProps {
  readonly samples: readonly GpsSample[];
  readonly pose: MapFollowPose | null;
  readonly height?: number;
  readonly following: boolean;
  readonly onUnavailable?: () => void;
  readonly onUseLocalMap?: () => void;
  readonly onUserMoved?: () => void;
  readonly onRecenter?: () => void;
}

/** True when the platform-specific Maps SDK key was present at config time. */
export function isGoogleMapsSdkConfigured(): boolean {
  const extra = Constants.expoConfig?.extra as
    | { googleMapsIosConfigured?: boolean; googleMapsAndroidConfigured?: boolean }
    | undefined;
  if (Platform.OS === "ios") return extra?.googleMapsIosConfigured === true;
  if (Platform.OS === "android") return extra?.googleMapsAndroidConfigured === true;
  return false;
}
