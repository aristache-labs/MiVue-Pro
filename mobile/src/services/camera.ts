import type { Camera } from '../types';

/**
 * Camera service stub - to be implemented
 * Handles camera discovery, connection, and basic communication
 */

class CameraService {
  async discover(): Promise<Camera[]> {
    // TODO: Implement camera discovery via WiFi
    // For now, return empty array
    return [];
  }

  async connect(cameraId: string): Promise<void> {
    // TODO: Implement camera connection
    console.log(`Connecting to camera: ${cameraId}`);
  }

  async disconnect(cameraId: string): Promise<void> {
    // TODO: Implement camera disconnection
    console.log(`Disconnecting from camera: ${cameraId}`);
  }

  async getCameraInfo(cameraId: string): Promise<Camera | null> {
    // TODO: Implement get camera info
    return null;
  }
}

export const cameraService = new CameraService();
