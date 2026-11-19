import api from './api';
import { API_CONFIG } from '../constants/config';

export interface TableComparison {
  ssTable: string;
  pgTable: string;
  displayName: string;
  category: string;
  ssCount: number;
  pgCount: number;
  status: 'synced' | 'partial' | 'missing';
  gap: number;
}

export interface MigrationJob {
  status: 'running' | 'completed' | 'failed';
  lines: string[];
  startTime: string;
  endTime?: string;
}

export interface ScanResult {
  scanStatus: 'clean' | 'threat' | 'error';
  scanMessage: string;
  scanLog: string[];
}

const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB per chunk

function getAuthHeaders(): Record<string, string> {
  // Cookies are sent automatically; no extra header needed for cookie-auth
  return { 'Content-Type': 'application/json' };
}

export const migrationApi = {
  // ── Table comparison ──────────────────────────────────────────────────────
  compare: async (): Promise<TableComparison[]> => {
    const res = await api.makeRequest('/Migration/compare');
    return (res as any).data as TableComparison[];
  },

  // ── Run migration ──────────────────────────────────────────────────────────
  run: async (tables: string[], targetPgConnStr?: string): Promise<string> => {
    const res = await api.makeRequest('/Migration/run', {
      method: 'POST',
      body: JSON.stringify({ tables, targetPgConnStr }),
    });
    return (res as any).jobId as string;
  },

  // ── Job status ─────────────────────────────────────────────────────────────
  getJob: async (jobId: string): Promise<MigrationJob> => {
    const res = await api.makeRequest(`/Migration/job/${jobId}`);
    return res as unknown as MigrationJob;
  },

  // ── Backup: upload file in chunks with progress ───────────────────────────
  uploadBackup: async (
    file: File,
    onProgress: (pct: number, chunk: number, total: number) => void,
  ): Promise<string> => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    // Init
    const initRes = await api.makeRequest('/Migration/backup/init', {
      method: 'POST',
      body: JSON.stringify({ fileName: file.name, totalSize: file.size, totalChunks }),
    });
    const uploadId = (initRes as any).uploadId as string;

    // Upload chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      await fetch(
        `${API_CONFIG.BASE_URL}/Migration/backup/chunk?uploadId=${uploadId}&chunkIndex=${i}`,
        { method: 'POST', body: chunk, credentials: 'include' }
      ).then(r => { if (!r.ok) throw new Error(`Chunk ${i} upload failed`); });

      onProgress(Math.round(((i + 1) / totalChunks) * 100), i + 1, totalChunks);
    }

    return uploadId;
  },

  // ── Backup: trigger scan ──────────────────────────────────────────────────
  scanBackup: async (uploadId: string, sourceConnStr?: string): Promise<ScanResult> => {
    const res = await api.makeRequest(`/Migration/backup/scan/${uploadId}`, {
      method: 'POST',
      body: JSON.stringify({ sourceConnStr }),
    });
    return res as unknown as ScanResult;
  },

  // ── Backup: trigger DB restore ────────────────────────────────────────────
  restoreBackup: async (uploadId: string, targetDatabase: string, sourceConnStr?: string): Promise<string> => {
    const res = await api.makeRequest(`/Migration/backup/restore/${uploadId}`, {
      method: 'POST',
      body: JSON.stringify({ targetDatabase, sourceConnStr }),
    });
    return (res as any).jobId as string;
  },
};
