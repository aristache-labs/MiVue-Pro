import { Platform, Vibration } from "react-native";

/** One-shot light haptic without adding packages. */
export function triggerLocalSelectionHaptic(): void {
  try {
    if (Platform.OS === "android") {
      Vibration.vibrate(12);
    } else {
      Vibration.vibrate(10);
    }
  } catch {
    // ignore unavailable vibration
  }
}
