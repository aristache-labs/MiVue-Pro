import React, { memo, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ListRenderItemInfo } from 'react-native';
import { useTheme } from '../hooks/useTheme';
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
  const { theme } = useTheme();

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
      style={[
        styles.fileItem,
        {
          backgroundColor: theme.colors.surfaceElevated,
          borderColor: isSelected 
            ? theme.colors.brand 
            : theme.colors.borderSoft,
        },
        isSelected && {
          backgroundColor: theme.colors.brandSoft,
        },
      ]}
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
          <Text style={[styles.fileName, { color: theme.colors.text }]} numberOfLines={1}>
            {file.name}
          </Text>
          {file.protected && (
            <View style={styles.protectedBadge}>
              <Text style={styles.protectedText}>🔒</Text>
            </View>
          )}
        </View>
        
        <View style={styles.fileDetails}>
          <Text style={[styles.fileType, { color: theme.colors.textMuted }]}>{file.type.toUpperCase()}</Text>
          <Text style={[styles.fileSeparator, { color: theme.colors.border }]}>•</Text>
          <Text style={[styles.fileSize, { color: theme.colors.textMuted }]}>{formatFileSize(file.size)}</Text>
          <Text style={[styles.fileSeparator, { color: theme.colors.border }]}>•</Text>
          <Text style={[styles.fileDate, { color: theme.colors.textMuted }]}>{formatDate(file.date)}</Text>
        </View>
      </View>
      
      {isSelected && (
        <View style={[styles.checkmark, { backgroundColor: theme.colors.brand }]}>
          <Text style={[styles.checkmarkText, { color: theme.colors.onBrand }]}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
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
  const { theme } = useTheme();

  const keyExtractor = useCallback((item: CameraFile) => item.id, []);

  const renderItem = useCallback(({ item }: ListRenderItemInfo<CameraFile>) => (
    <FileItem
      file={item}
      isSelected={selectedFiles.has(item.id)}
      onPress={onFilePress}
      onSelect={onFileSelect}
    />
  ), [selectedFiles, onFilePress, onFileSelect]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>{emptyMessage}</Text>
    </View>
  ), [emptyMessage, theme]);

  const renderSeparator = useCallback(() => (
    <View style={styles.separator} />
  ), []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>Loading files...</Text>
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
        length: 80,
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
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
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
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  fileSeparator: {
    marginHorizontal: 6,
    fontSize: 12,
  },
  fileSize: {
    fontSize: 12,
  },
  fileDate: {
    fontSize: 12,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  checkmarkText: {
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
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
});
