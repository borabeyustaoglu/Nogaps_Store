import type { AuditLog } from '../types/audit';
import { STORAGE_KEYS } from '../constants/storage';

const STORAGE_KEY = STORAGE_KEYS.auditLogs;
const MAX_LOGS = 300;

export const readAuditLogs = (): AuditLog[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AuditLog[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const appendAuditLog = (
  item: Omit<AuditLog, 'id' | 'createdAt'>
): AuditLog[] => {
  const logs = readAuditLogs();
  const next: AuditLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    createdAt: new Date().toISOString(),
    ...item,
  };
  const nextLogs = [next, ...logs].slice(0, MAX_LOGS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextLogs));
  return nextLogs;
};
