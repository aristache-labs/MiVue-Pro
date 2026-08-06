import React, { memo, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ListRenderItemInfo } from 'react-native';
import type { CameraFile } from '../types';

interface FileListProps {
  files: CameraFile[];
  selectedFiles: Set<string>;
  onFilePress: (file: CameraFile) => void;
  onFileSelect: (fileId: string) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

// Memoized file item component
const FileItem = memo<{
  file: CameraFile;
  isSelected: boolean;
  onPress: (file: CameraFile) => void;
  onSelect: (fileId: string) => void;
}>(({ file, isSelected, onPress, onSelect }) => {
  const handlePress = useCallback(() => {
    onPress(file);
  }, [file, onPress]);

  const handleLongPress = useCallback(() => {
    onSelect(file.id);
  }, [file.id, onSelect]);

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }, []);

  const formatDate = useCallback((date: string): string => {
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  }, []);

  return (
    <TouchableOpacity
      style={[styles.fileItem, isSelected && styles.fileItemSelected]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
      accessibilityLabel={`File ${file.name}`}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityHint="Tap to view, long press to select"
    >
      <View style={styles.fileInfo}>
        <View style={styles.fileHeader}>
          <Text style={styles.fileName} numberOfLines={1}>
            {file.name}
          </Text>
          {file.protected && (
            <View style={styles.protectedBadge}>
              <Text style={styles.protectedText}>🔒</Text>
            </View>
          )}
        </View>
        
        <View style={styles.fileDetails}>
          <Text style={styles.fileType}>{file.type.toUpperCase()}</Text>
          <Text style={styles.fileSeparator}>•</Text>
          <Text style={styles.fileSize}>{formatFileSize(file.size)}</Text>
          <Text style={styles.fileSeparator}>•</Text>
          <Text style={styles.fileDate}>{formatDate(file.date)}</Text>
        </View>
      </View>
      
      {isSelected && (
        <View style={styles.checkmark}>
          <Text style={styles.checkmarkText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for optimal re-rendering
  return (
    prevProps.file.id === nextProps.file.id &&
    prevProps.file.name === nextProps.file.name &&
    prevProps.file.size === nextProps.file.size &&
    prevProps.file.type === nextProps.file.type &&
    prevProps.file.protected === nextProps.file.protected &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.onPress === nextProps.onPress &&
    prevProps.onSelect === nextProps.onSelect
  );
});

FileItem.displayName = 'FileItem';

export const FileList = memo<FileListProps>(({
  files,
  selectedFiles,
  onFilePress,
  onFileSelect,
  isLoading = false,
  emptyMessage = 'No files found',
}) => {
  // Memoized key extractor
  const keyExtractor = useCallback((item: CameraFile) => item.id, []);

  // Memoized render item
  const renderItem = useCallback(({ item }: ListRenderItemInfo<CameraFile>) => (
    <FileItem
      file={item}
      isSelected={selectedFiles.has(item.id)}
      onPress={onFilePress}
      onSelect={onFileSelect}
    />
  ), [selectedFiles, onFilePress, onFileSelect]);

  // Memoized empty component
  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>{emptyMessage}</Text>
    </View>
  ), [emptyMessage]);

  // Memoized item separator
  const renderSeparator = useCallback(() => (
    <View style={styles.separator} />
  ), []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading files...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={files}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListEmptyComponent={renderEmpty}
      ItemSeparatorComponent={renderSeparator}
      contentContainerStyle={files.length === 0 ? styles.emptyContentContainer : styles.contentContainer}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={15}
      windowSize={21}
      getItemLayout={(data, index) => ({
        length: 80, // Approximate item height
        offset: 80 * index,
        index,
      })}
    />
  );
});

FileList.displayName = 'FileList';

const styles = StyleSheet.create({
  contentContainer: {
    padding: 16,
  },
  emptyContentContainer: {
    flex: 1,
    padding: 16,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  fileItemSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  fileInfo: {
    flex: 1,
  },
  fileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  protectedBadge: {
    marginLeft: 8,
  },
  protectedText: {
    fontSize: 14,
  },
  fileDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileType: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  fileSeparator: {
    marginHorizontal: 6,
    color: '#999',
    fontSize: 12,
  },
  fileSize: {
    fontSize: 12,
    color: '#666',
  },
  fileDate: {
    fontSize: 12,
    color: '#666',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  separator: {
    height: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
});
