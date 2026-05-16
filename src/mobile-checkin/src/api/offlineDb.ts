import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('offline_checkins.db');

export const initDB = () => {
  db.execSync(`
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
  db.runSync(
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
  return db.getAllSync<{
    id: number;
    qr_token: string;
    client_event_id: string;
    checked_in_at: string;
  }>('SELECT id, qr_token, client_event_id, checked_in_at FROM offline_checkins WHERE synced = 0');
};

export const markAsSynced = (clientEventIds: string[]): void => {
  if (clientEventIds.length === 0) return;
  const placeholders = clientEventIds.map(() => '?').join(',');
  db.runSync(`UPDATE offline_checkins SET synced = 1 WHERE client_event_id IN (${placeholders})`, clientEventIds);
};

export const getPendingCount = (): number => {
  const result = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM offline_checkins WHERE synced = 0');
  return result?.count || 0;
};
