import { useState, useEffect, useCallback, useMemo } from 'react';
import { fileManagementService } from '../services/fileManagement';
import type { CameraFile, FileFilter, SortOption } from '../types';

interface UseFilesResult {
  files: CameraFile[];
  filteredFiles: CameraFile[];
  isLoading: boolean;
  error: Error | null;
  filter: FileFilter;
  sortBy: SortOption;
  selectedFiles: Set<string>;
  setFilter: (filter: FileFilter) => void;
  setSortBy: (sortBy: SortOption) => void;
  toggleFileSelection: (fileId: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  refreshFiles: (cameraId: string) => Promise<void>;
  deleteFiles: (fileIds: string[]) => Promise<void>;
  downloadFiles: (fileIds: string[]) => Promise<void>;
  protectFiles: (fileIds: string[], protect: boolean) => Promise<void>;
}

export function useFiles(cameraId: string | null): UseFilesResult {
  const [files, setFiles] = useState<CameraFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [filter, setFilter] = useState<FileFilter>({ type: 'all' });
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  // Memoize filtered and sorted files
  const filteredFiles = useMemo(() => {
    if (!files.length) return [];

    let filtered = [...files];

    // Apply filters
    if (filter.type !== 'all') {
      filtered = filtered.filter(file => file.type === filter.type);
    }
    if (filter.protected !== undefined) {
      filtered = filtered.filter(file => file.protected === filter.protected);
    }
    if (filter.dateFrom) {
      filtered = filtered.filter(file => new Date(file.date) >= filter.dateFrom!);
    }
    if (filter.dateTo) {
      filtered = filtered.filter(file => new Date(file.date) <= filter.dateTo!);
    }
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filtered = filtered.filter(file => 
        file.name.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'date-asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'size-desc':
          return b.size - a.size;
        case 'size-asc':
          return a.size - b.size;
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [files, filter, sortBy]);

  // Memoize refresh function
  const refreshFiles = useCallback(async (camId: string) => {
    if (!camId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const fetchedFiles = await fileManagementService.listFiles(camId);
      setFiles(fetchedFiles);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch files'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Memoize file selection handlers
  const toggleFileSelection = useCallback((fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedFiles(new Set(filteredFiles.map(f => f.id)));
  }, [filteredFiles]);

  const clearSelection = useCallback(() => {
    setSelectedFiles(new Set());
  }, []);

  // Memoize bulk operations
  const deleteFiles = useCallback(async (fileIds: string[]) => {
    if (!cameraId) return;
    
    try {
      setError(null);
      await fileManagementService.deleteFiles(cameraId, fileIds);
      await refreshFiles(cameraId);
      clearSelection();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete files'));
      throw err;
    }
  }, [cameraId, refreshFiles, clearSelection]);

  const downloadFiles = useCallback(async (fileIds: string[]) => {
    if (!cameraId) return;
    
    try {
      setError(null);
      await fileManagementService.downloadFiles(cameraId, fileIds);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to download files'));
      throw err;
    }
  }, [cameraId]);

  const protectFiles = useCallback(async (fileIds: string[], protect: boolean) => {
    if (!cameraId) return;
    
    try {
      setError(null);
      await fileManagementService.protectFiles(cameraId, fileIds, protect);
      await refreshFiles(cameraId);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to protect files'));
      throw err;
    }
  }, [cameraId, refreshFiles]);

  // Load files when camera changes
  useEffect(() => {
    if (cameraId) {
      refreshFiles(cameraId);
    } else {
      setFiles([]);
    }
  }, [cameraId, refreshFiles]);

  // Memoize return object
  return useMemo(() => ({
    files,
    filteredFiles,
    isLoading,
    error,
    filter,
    sortBy,
    selectedFiles,
    setFilter,
    setSortBy,
    toggleFileSelection,
    selectAll,
    clearSelection,
    refreshFiles,
    deleteFiles,
    downloadFiles,
    protectFiles,
  }), [
    files,
    filteredFiles,
    isLoading,
    error,
    filter,
    sortBy,
    selectedFiles,
    toggleFileSelection,
    selectAll,
    clearSelection,
    refreshFiles,
    deleteFiles,
    downloadFiles,
    protectFiles,
  ]);
}
