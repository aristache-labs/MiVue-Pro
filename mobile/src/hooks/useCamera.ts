import { useState, useEffect, useCallback, useMemo } from 'react';
import { cameraService } from '../services/camera';
import type { Camera, CameraStatus } from '../types';

interface UseCameraResult {
  cameras: Camera[];
  selectedCamera: Camera | null;
  status: CameraStatus;
  isConnecting: boolean;
  error: Error | null;
  selectCamera: (id: string) => void;
  refreshCameras: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export function useCamera(): UseCameraResult {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [status, setStatus] = useState<CameraStatus>('disconnected');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Memoize selected camera to prevent unnecessary re-renders
  const selectedCamera = useMemo(() => {
    return cameras.find(cam => cam.id === selectedCameraId) || null;
  }, [cameras, selectedCameraId]);

  // Memoize camera discovery function
  const refreshCameras = useCallback(async () => {
    try {
      setError(null);
      const discoveredCameras = await cameraService.discover();
      setCameras(discoveredCameras);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to discover cameras'));
    }
  }, []);

  // Memoize camera selection handler
  const selectCamera = useCallback(async (id: string) => {
    try {
      setIsConnecting(true);
      setError(null);
      await cameraService.connect(id);
      setSelectedCameraId(id);
      setStatus('connected');
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to connect to camera'));
      setStatus('error');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Memoize disconnect handler
  const disconnect = useCallback(async () => {
    try {
      setError(null);
      if (selectedCameraId) {
        await cameraService.disconnect(selectedCameraId);
      }
      setSelectedCameraId(null);
      setStatus('disconnected');
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to disconnect'));
    }
  }, [selectedCameraId]);

  // Initial camera discovery on mount
  useEffect(() => {
    refreshCameras();
  }, [refreshCameras]);

  // Memoize the entire return object to prevent unnecessary re-renders downstream
  return useMemo(() => ({
    cameras,
    selectedCamera,
    status,
    isConnecting,
    error,
    selectCamera,
    refreshCameras,
    disconnect,
  }), [cameras, selectedCamera, status, isConnecting, error, selectCamera, refreshCameras, disconnect]);
}
