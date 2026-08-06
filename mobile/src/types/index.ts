// Core types for Laneory mobile app

export type CameraStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface Camera {
  id: string;
  name: string;
  model: string;
  firmware?: string;
  ip: string;
  ssid?: string;
  lastSeen?: string;
}

export type FileType = 'normal' | 'parking' | 'event';

export interface CameraFile {
  id: string;
  name: string;
  path: string;
  type: FileType;
  size: number;
  date: string;
  protected: boolean;
  thumbnail?: string;
  duration?: number;
}

export interface FileFilter {
  type?: FileType | 'all';
  protected?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export type SortOption = 
  | 'date-desc' 
  | 'date-asc' 
  | 'size-desc' 
  | 'size-asc' 
  | 'name-asc' 
  | 'name-desc';

export type SettingValue = string | number | boolean;

export interface CameraSettings {
  // Common settings - all optional to support partial updates
  frequency?: '50Hz' | '60Hz';
  ev?: number;
  dateTime?: string;
  timeZone?: string;
  daylightSaving?: boolean;
  videoResolution?: '4K' | '1080p' | '720p';
  clipDuration?: 1 | 2 | 3 | 5;
  audioRecording?: boolean;
  gSensorSensitivity?: 'high' | 'medium' | 'low' | 'off';
  parkingMode?: boolean;
  motionDetection?: boolean;
  exposure?: number;
  volume?: number;
  gpsOverlay?: boolean;
  licensePlate?: string;
  adasEnabled?: boolean;
  // Allow dynamic settings from camera
  [key: string]: SettingValue | undefined;
}

export interface Profile {
  id: string;
  name: string;
  settings: Partial<CameraSettings>;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export type AutomationTrigger = 
  | 'manual'
  | 'schedule'
  | 'storage-low'
  | 'on-connect'
  | 'on-disconnect'
  | 'location';

export type AutomationAction = 
  | 'sync-files'
  | 'delete-old-files'
  | 'apply-profile'
  | 'download-events'
  | 'format-sd';

export interface Automation {
  id: string;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  action: AutomationAction;
  config: Record<string, any>;
  lastRun?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  biometricEnabled: boolean;
  autoConnect: boolean;
  downloadQuality: 'original' | 'compressed';
  notificationsEnabled: boolean;
  analyticsEnabled: boolean;
  language: string;
}

export interface DownloadTask {
  id: string;
  fileId: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'downloading' | 'paused' | 'completed' | 'failed';
  localUri?: string;
  error?: string;
}

export interface NetworkInfo {
  isConnected: boolean;
  type: 'wifi' | 'cellular' | 'none';
  strength?: number;
}

export interface CameraCapability {
  id: string;
  name: string;
  supported: boolean;
  values?: any[];
  min?: number;
  max?: number;
}

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: string;
}

export interface BackupData {
  version: string;
  createdAt: string;
  settings: AppSettings;
  profiles: Profile[];
  automations: Automation[];
}
