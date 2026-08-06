import { useState, useEffect, useCallback, useMemo } from 'react';
import { cameraSettingsService } from '../services/cameraSettings';
import type { CameraSettings, SettingValue } from '../types';

interface UseSettingsResult {
  settings: CameraSettings | null;
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;
  hasUnsavedChanges: boolean;
  updateSetting: (key: string, value: SettingValue) => void;
  saveSetting: (key: string) => Promise<void>;
  saveAllSettings: () => Promise<void>;
  refreshSettings: (cameraId: string) => Promise<void>;
  resetSetting: (key: string) => void;
  resetAllSettings: () => void;
}

export function useSettings(cameraId: string | null): UseSettingsResult {
  const [settings, setSettings] = useState<CameraSettings | null>(null);
  const [originalSettings, setOriginalSettings] = useState<CameraSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Memoize unsaved changes detection
  const hasUnsavedChanges = useMemo(() => {
    if (!settings || !originalSettings) return false;
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  }, [settings, originalSettings]);

  // Memoize refresh function
  const refreshSettings = useCallback(async (camId: string) => {
    if (!camId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const fetchedSettings = await cameraSettingsService.getSettings(camId);
      setSettings(fetchedSettings);
      setOriginalSettings(fetchedSettings);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch settings'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Memoize setting update handler (local only)
  const updateSetting = useCallback((key: string, value: SettingValue) => {
    setSettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [key]: value,
      };
    });
  }, []);

  // Memoize save single setting
  const saveSetting = useCallback(async (key: string) => {
    if (!cameraId || !settings) return;
    
    const value = settings[key];
    if (value === undefined) return;
    
    try {
      setIsSaving(true);
      setError(null);
      
      await cameraSettingsService.updateSetting(cameraId, key, value);
      
      // Update original settings after successful save
      setOriginalSettings(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          [key]: settings[key],
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(`Failed to save setting: ${key}`));
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [cameraId, settings]);

  // Memoize save all settings
  const saveAllSettings = useCallback(async () => {
    if (!cameraId || !settings) return;
    
    try {
      setIsSaving(true);
      setError(null);
      
      await cameraSettingsService.updateSettings(cameraId, settings);
      
      // Update original settings after successful save
      setOriginalSettings(settings);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to save settings'));
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [cameraId, settings]);

  // Memoize reset single setting
  const resetSetting = useCallback((key: string) => {
    if (!originalSettings) return;
    
    setSettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [key]: originalSettings[key],
      };
    });
  }, [originalSettings]);

  // Memoize reset all settings
  const resetAllSettings = useCallback(() => {
    if (originalSettings) {
      setSettings(originalSettings);
    }
  }, [originalSettings]);

  // Load settings when camera changes
  useEffect(() => {
    if (cameraId) {
      refreshSettings(cameraId);
    } else {
      setSettings(null);
      setOriginalSettings(null);
    }
  }, [cameraId, refreshSettings]);

  // Memoize return object
  return useMemo(() => ({
    settings,
    isLoading,
    isSaving,
    error,
    hasUnsavedChanges,
    updateSetting,
    saveSetting,
    saveAllSettings,
    refreshSettings,
    resetSetting,
    resetAllSettings,
  }), [
    settings,
    isLoading,
    isSaving,
    error,
    hasUnsavedChanges,
    updateSetting,
    saveSetting,
    saveAllSettings,
    refreshSettings,
    resetSetting,
    resetAllSettings,
  ]);
}
