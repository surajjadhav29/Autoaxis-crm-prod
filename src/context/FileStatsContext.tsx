import { createContext, useContext, useCallback, useState, type ReactNode } from 'react';
import { useAuth } from '@/features/auth';
import { fetchStats } from '../services/fileService';
import type { FileStats } from '@/types/file.types';

interface FileStatsContextValue {
  stats: FileStats | null;
  refreshStats: () => Promise<void>;
}

const FileStatsContext = createContext<FileStatsContextValue | null>(null);

export function FileStatsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [stats, setStats] = useState<FileStats | null>(null);

  const refreshStats = useCallback(async () => {
    if (!user) return;
    const data = await fetchStats(user);
    setStats(data);
  }, [user]);

  return (
    <FileStatsContext.Provider value={{ stats, refreshStats }}>
      {children}
    </FileStatsContext.Provider>
  );
}

export function useFileStats() {
  const ctx = useContext(FileStatsContext);
  if (!ctx) {
    throw new Error('useFileStats must be used within FileStatsProvider');
  }
  return ctx;
}
