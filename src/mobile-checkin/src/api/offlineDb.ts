import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

// Explicit type interface for our Database operations to ensure strict TypeScript safety
export interface OfflineDatabase {
  execSync(sql: string): void;
  runSync(sql: string, params?: any[]): void;
  getAllSync<T>(sql: string, params?: any[]): T[];
  getFirstSync<T>(sql: string, params?: any[]): T | null;
}

// Web localStorage fallback class to support Expo Web mode
interface OfflineCheckin {
  id: number;
  qr_token: string;
  client_event_id: string;
  checked_in_at: string;
  synced: number;
  created_at: string;
}

class WebSQLiteMock implements OfflineDatabase {
  private getStorage(): OfflineCheckin[] {
    if (typeof localStorage === 'undefined') return [];
    const data = localStorage.getItem('offline_checkins');
    return data ? JSON.parse(data) : [];
  }

  private saveStorage(data: OfflineCheckin[]) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('offline_checkins', JSON.stringify(data));
  }

  execSync(sql: string) {
    // No-op: Table is managed dynamically in localStorage
  }

  runSync(sql: string, params: any[] = []) {
    const data = this.getStorage();
    if (sql.includes('INSERT OR IGNORE')) {
      const [qrToken, clientEventId, checkedInAt] = params;
      if (data.some(item => item.client_event_id === clientEventId)) {
        return;
      }
      data.push({
        id: data.length + 1,
        qr_token: qrToken,
        client_event_id: clientEventId,
        checked_in_at: checkedInAt,
        synced: 0,
        created_at: new Date().toISOString()
      });
      this.saveStorage(data);
    } else if (sql.includes('UPDATE offline_checkins SET synced = 1')) {
      const idsToSync = new Set(params);
      const updated = data.map(item => {
        if (idsToSync.has(item.client_event_id)) {
          return { ...item, synced: 1 };
        }
        return item;
      });
      this.saveStorage(updated);
    }
  }

  getAllSync<T>(sql: string, params: any[] = []): T[] {
    if (sql.includes('SELECT id, qr_token, client_event_id, checked_in_at FROM offline_checkins WHERE synced = 0')) {
      const pending = this.getStorage().filter(item => item.synced === 0);
      return pending as unknown as T[];
    }
    return [];
  }

  getFirstSync<T>(sql: string, params: any[] = []): T | null {
    if (sql.includes('SELECT COUNT(*)')) {
      const count = this.getStorage().filter(item => item.synced === 0).length;
      return { count } as unknown as T;
    }
    return null;
  }
}

// Lazy-loaded DB instance typed with our OfflineDatabase interface
let dbInstance: OfflineDatabase | null = null;

const getDB = (): OfflineDatabase => {
  if (dbInstance) return dbInstance;

  if (Platform.OS === 'web') {
    dbInstance = new WebSQLiteMock();
  } else {
    try {
      dbInstance = SQLite.openDatabaseSync('offline_checkins.db') as any as OfflineDatabase;
    } catch (e) {
      console.warn('Failed to open native SQLite database, falling back to localStorage mock', e);
      dbInstance = new WebSQLiteMock();
    }
  }
  return dbInstance;
};

export const initDB = () => {
  getDB().execSync(`
    CREATE TABLE IF NOT EXISTS offline_checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      qr_token TEXT NOT NULL,
      client_event_id TEXT NOT NULL UNIQUE,
      checked_in_at TEXT NOT NULL,
      synced INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
};

export const saveCheckin = (qrToken: string, clientEventId: string, checkedInAt: string): void => {
  getDB().runSync(
    'INSERT OR IGNORE INTO offline_checkins (qr_token, client_event_id, checked_in_at) VALUES (?, ?, ?)',
    [qrToken, clientEventId, checkedInAt]
  );
};

export const getPendingCheckins = (): Array<{
  id: number;
  qr_token: string;
  client_event_id: string;
  checked_in_at: string;
}> => {
  return getDB().getAllSync<{
    id: number;
    qr_token: string;
    client_event_id: string;
    checked_in_at: string;
  }>('SELECT id, qr_token, client_event_id, checked_in_at FROM offline_checkins WHERE synced = 0');
};

export const markAsSynced = (clientEventIds: string[]): void => {
  if (clientEventIds.length === 0) return;
  const placeholders = clientEventIds.map(() => '?').join(',');
  getDB().runSync(`UPDATE offline_checkins SET synced = 1 WHERE client_event_id IN (${placeholders})`, clientEventIds);
};

export const getPendingCount = (): number => {
  const result = getDB().getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM offline_checkins WHERE synced = 0');
  return result?.count || 0;
};
