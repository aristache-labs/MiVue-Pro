import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import type { CameraFile } from '../types';

interface VideoPlayerProps {
  file: CameraFile;
  uri: string;
  autoPlay?: boolean;
  onClose?: () => void;
}

export const VideoPlayer = memo<VideoPlayerProps>(({ 
  file, 
  uri, 
  autoPlay = false,
  onClose,
}) => {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isLoading, setIsLoading] = useState(true);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Memoized playback status update handler
  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsLoading(false);
      setIsPlaying(status.isPlaying);
      setPosition(status.positionMillis);
      setDuration(status.durationMillis || 0);
      
      if (status.didJustFinish) {
        setIsPlaying(false);
      }
    } else if (status.error) {
      setError(`Playback error: ${status.error}`);
      setIsLoading(false);
    }
  }, []);

  // Memoized play/pause toggle
  const togglePlayPause = useCallback(async () => {
    if (!videoRef.current) return;
    
    try {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    } catch (err) {
      setError('Failed to toggle playback');
    }
  }, [isPlaying]);

  // Memoized seek handler
  const handleSeek = useCallback(async (newPosition: number) => {
    if (!videoRef.current) return;
    
    try {
      await videoRef.current.setPositionAsync(newPosition);
    } catch (err) {
      setError('Failed to seek');
    }
  }, []);

  // Memoized replay handler
  const handleReplay = useCallback(async () => {
    if (!videoRef.current) return;
    
    try {
      await videoRef.current.replayAsync();
    } catch (err) {
      setError('Failed to replay');
    }
  }, []);

  // Memoized close handler
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  // Format time helper (memoized)
  const formatTime = useCallback((milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.unloadAsync();
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {file.name}
        </Text>
        {onClose && (
          <TouchableOpacity 
            onPress={handleClose}
            style={styles.closeButton}
            accessibilityLabel="Close video player"
            accessibilityRole="button"
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Video Container */}
      <View style={styles.videoContainer}>
        <Video
          ref={videoRef}
          source={{ uri }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={autoPlay}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          useNativeControls={false}
        />
        
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Loading video...</Text>
          </View>
        )}
        
        {error && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <View style={styles.progressContainer}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: duration > 0 ? `${(position / duration) * 100}%` : '0%' }
              ]} 
            />
          </View>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity 
            onPress={handleReplay}
            style={styles.controlButton}
            accessibilityLabel="Replay video"
            accessibilityRole="button"
          >
            <Text style={styles.controlButtonText}>↻</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={togglePlayPause}
            style={[styles.controlButton, styles.playButton]}
            disabled={isLoading}
            accessibilityLabel={isPlaying ? 'Pause video' : 'Play video'}
            accessibilityRole="button"
            accessibilityState={{ disabled: isLoading }}
          >
            <Text style={styles.playButtonText}>
              {isPlaying ? '⏸' : '▶'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => handleSeek(Math.min(position + 10000, duration))}
            style={styles.controlButton}
            accessibilityLabel="Skip forward 10 seconds"
            accessibilityRole="button"
          >
            <Text style={styles.controlButtonText}>+10s</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* File info */}
      <View style={styles.info}>
        <Text style={styles.infoText}>
          Type: {file.type.toUpperCase()} • Size: {(file.size / (1024 * 1024)).toFixed(2)} MB
        </Text>
        {file.protected && (
          <Text style={styles.protectedText}>🔒 Protected</Text>
        )}
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  // Only re-render if file or uri changes
  return (
    prevProps.file.id === nextProps.file.id &&
    prevProps.uri === nextProps.uri &&
    prevProps.autoPlay === nextProps.autoPlay &&
    prevProps.onClose === nextProps.onClose
  );
});

VideoPlayer.displayName = 'VideoPlayer';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '300',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
    textAlign: 'center',
  },
  controls: {
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    minWidth: 40,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#007AFF',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  playButtonText: {
    color: '#fff',
    fontSize: 24,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  infoText: {
    color: '#999',
    fontSize: 12,
  },
  protectedText: {
    color: '#FFD700',
    fontSize: 12,
  },
});
