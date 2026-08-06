import * as ExpoHaptics from 'expo-haptics';
import { Platform } from 'react-native';

class HapticManager {
  private isEnabled = true; // Could be connected to user settings in the future

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  /** Light impact - for small UI interactions like toggle switches, micro-animations */
  light() {
    if (!this.isEnabled) return;
    try {
      ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
  }

  /** Medium impact - for standard button presses, opening menus */
  medium() {
    if (!this.isEnabled) return;
    try {
      ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch {}
  }

  /** Heavy impact - for destructive actions, major state changes */
  heavy() {
    if (!this.isEnabled) return;
    try {
      ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    } catch {}
  }

  /** Selection feedback - distinct pattern for selecting items in a list/grid */
  selection() {
    if (!this.isEnabled) return;
    try {
      ExpoHaptics.selectionAsync().catch(() => {});
    } catch {}
  }

  /** Success feedback - for completing an action */
  success() {
    if (!this.isEnabled) return;
    try {
      ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {}
  }

  /** Warning feedback */
  warning() {
    if (!this.isEnabled) return;
    try {
      ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Warning).catch(() => {});
    } catch {}
  }

  /** Error feedback */
  error() {
    if (!this.isEnabled) return;
    try {
      ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Error).catch(() => {});
    } catch {}
  }
}

export const Haptics = new HapticManager();
