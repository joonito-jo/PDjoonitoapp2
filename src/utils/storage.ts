import type { BackupSnapshot, KnowledgeData } from '../types';
import { initialData } from '../data/initialData';
import { normalizeData } from './normalize';

export const STORAGE_KEY = 'pe-knowledge-map-v6';
export const BACKUP_STORAGE_KEY = 'pe-knowledge-map-v6-auto-backups';
const MAX_BACKUPS = 10;

const LEGACY_KEYS = [
  STORAGE_KEY,
  'pe-knowledge-map-v5',
  'pe-knowledge-map-v4',
  'pe-teacher-exam-knowledge-db-v5',
  'pe-teacher-exam-knowledge-db-v4',
  'pe-teacher-exam-knowledge-db-v3',
  'pe-teacher-exam-knowledge-db-v2',
  'pe-teacher-exam-knowledge-db-v1'
];

export function loadData(): KnowledgeData {
  for (const key of LEGACY_KEYS) {
    const saved = localStorage.getItem(key);
    if (!saved) continue;
    try {
      const normalized = normalizeData(JSON.parse(saved));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    } catch {
      continue;
    }
  }
  return initialData;
}

export function saveData(data: KnowledgeData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function downloadJson(data: KnowledgeData, filename = 'pe-knowledge-map-v6-backup.json'): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function loadBackups(): BackupSnapshot[] {
  const saved = localStorage.getItem(BACKUP_STORAGE_KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        id: typeof item.id === 'string' ? item.id : `B-${Date.now()}`,
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
        reason: typeof item.reason === 'string' ? item.reason : '자동 백업',
        data: normalizeData(item.data)
      }))
      .filter((item) => item.data)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, MAX_BACKUPS);
  } catch {
    return [];
  }
}

export function saveBackups(backups: BackupSnapshot[]): BackupSnapshot[] {
  const trimmed = backups
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, MAX_BACKUPS);
  localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(trimmed));
  return trimmed;
}

export function createAutoBackup(data: KnowledgeData, reason: string): BackupSnapshot {
  const createdAt = new Date().toISOString();
  const backup: BackupSnapshot = {
    id: `B-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt,
    reason,
    data: normalizeData(JSON.parse(JSON.stringify(data)))
  };
  saveBackups([backup, ...loadBackups()]);
  return backup;
}

export function deleteBackup(backupId: string): BackupSnapshot[] {
  return saveBackups(loadBackups().filter((backup) => backup.id !== backupId));
}

function safeFilenamePart(value: string): string {
  return value
    .replace(/자동 백업/g, '')
    .replace(/\s+/g, '')
    .replace(/[^가-힣a-zA-Z0-9_-]/g, '')
    .slice(0, 40) || 'backup';
}

function formatBackupTimestamp(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.replace(/[^0-9]/g, '').slice(0, 12) || 'unknown';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}_${hh}${mi}`;
}

export function backupFilename(backup: BackupSnapshot): string {
  return `backup_${safeFilenamePart(backup.reason)}_${formatBackupTimestamp(backup.createdAt)}.json`;
}

export function downloadBackup(backup: BackupSnapshot): void {
  downloadJson(backup.data, backupFilename(backup));
}
