import type { ComponentProps } from "react";
import type Ionicons from "@expo/vector-icons/Ionicons";

import type { CameraSettingOption } from "@/components/settings/CameraSettingSheet";
import { formatCameraClockDisplay } from "@/components/settings/cameraClock";
import {
  CAMERA_SETTING_PROPERTY,
  CAMERA_SETTING_TITLE,
  CAMERA_SETTING_VALUES,
  CAMERA_SETTINGS_KEYS,
  formatCameraSettingValue,
  type CameraSettingKey,
} from "@/packages/protocol/src/index";

type IonName = ComponentProps<typeof Ionicons>["name"];

export const CAMERA_SETTING_ICONS: Readonly<Record<CameraSettingKey, IonName>> = Object.freeze({
  frequency: "pulse-outline",
  ev: "sunny-outline",
  dateTimeMode: "time-outline",
  timeZone: "globe-outline",
  daylightSaving: "contrast-outline",
});

export function cameraSettingOptions(key: CameraSettingKey): readonly CameraSettingOption[] {
  return CAMERA_SETTING_VALUES[key].map((value) => ({
    value,
    label: formatCameraSettingValue(key, value),
    ...(key === "dateTimeMode" && value === "MANUAL"
      ? {
          description:
            "Changes the camera’s date/time source mode. Does not set the clock from this phone.",
        }
      : {}),
  }));
}

export function rawCameraSettingValue(
  properties: Readonly<Record<string, string>>,
  key: CameraSettingKey,
): string | undefined {
  const property = CAMERA_SETTING_PROPERTY[key];
  const raw = properties[property];
  return typeof raw === "string" && raw.length > 0 ? raw : undefined;
}

export function displayCameraSettingValue(
  properties: Readonly<Record<string, string>>,
  key: CameraSettingKey,
): string {
  const raw = rawCameraSettingValue(properties, key);
  if (!raw) return "Not reported";
  return formatCameraSettingValue(key, raw);
}

/** Always a complete stamp or em dash — never a single TimeStamp component. */
export function cameraClockDisplay(
  properties: Readonly<Record<string, string>>,
): string {
  return formatCameraClockDisplay(properties);
}

export {
  CAMERA_SETTING_PROPERTY,
  CAMERA_SETTING_TITLE,
  CAMERA_SETTINGS_KEYS,
  formatCameraSettingValue,
};
