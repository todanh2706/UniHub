import initSqlJs, { type Database } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

let dbInstance: Database | null = null;

/**
 * Initialize the SQLite database (sql.js) for offline check-in storage.
 * Uses localStorage to persist the database across page reloads.
 * The schema stores qr_token (from QR scan) rather than registration_id,
 * since the device may be offline and won't have access to registration data.
 */
export const initDB = async (): Promise<Database> => {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs({
    locateFile: () => wasmUrl
  });

  // Try to load persisted database from localStorage
  const savedDb = localStorage.getItem('unihub_offline_db');
  if (savedDb) {
    const u8 = new Uint8Array(JSON.parse(savedDb));
    dbInstance = new SQL.Database(u8);
    // Ensure schema is up to date (CREATE IF NOT EXISTS is safe to re-run)
    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS offline_checkins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        qr_token TEXT NOT NULL,
        client_event_id TEXT NOT NULL UNIQUE,
        checked_in_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
  } else {
    dbInstance = new SQL.Database();
    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS offline_checkins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        qr_token TEXT NOT NULL,
        client_event_id TEXT NOT NULL UNIQUE,
        checked_in_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
    saveToLocalStorage();
  }

  return dbInstance;
};

/**
 * Persist the in-memory SQLite database to localStorage.
 * Called after every write operation to ensure data survives page reloads.
 */
export const saveToLocalStorage = (): void => {
  if (dbInstance) {
    const data = dbInstance.export();
    const array = Array.from(data);
    localStorage.setItem('unihub_offline_db', JSON.stringify(array));
  }
};

/**
 * Save a check-in record to the local offline database.
 * Called immediately when a QR code is scanned, regardless of network status.
 *
 * @param qrToken      - The QR token scanned from the student's QR code
 * @param clientEventId - A UUID v4 generated on the client to ensure idempotency
 * @param checkedInAt   - ISO 8601 timestamp of when the scan occurred on the device
 */
export const saveCheckin = async (
  qrToken: string,
  clientEventId: string,
  checkedInAt: string
): Promise<void> => {
  const db = await initDB();
  db.run(
    `INSERT OR IGNORE INTO offline_checkins (qr_token, client_event_id, checked_in_at)
     VALUES (?, ?, ?)`,
    [qrToken, clientEventId, checkedInAt]
  );
  saveToLocalStorage();
};

/**
 * Retrieve all check-in records that haven't been synced to the server yet.
 * Used by SyncManager when the device comes back online.
 *
 * @returns Array of pending check-in records with qr_token, client_event_id, checked_in_at
 */
export const getPendingCheckins = async (): Promise<
  Array<{
    id: number;
    qr_token: string;
    client_event_id: string;
    checked_in_at: string;
  }>
> => {
  const db = await initDB();
  const res = db.exec('SELECT id, qr_token, client_event_id, checked_in_at FROM offline_checkins WHERE synced = 0');
  if (res.length === 0) return [];

  const columns = res[0].columns;
  return res[0].values.map(row => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => (obj[col] = row[i]));
    return obj as {
      id: number;
      qr_token: string;
      client_event_id: string;
      checked_in_at: string;
    };
  });
};

/**
 * Mark check-in records as synced after successful server sync.
 * These records won't be sent again on the next sync attempt.
 *
 * @param clientEventIds - Array of client_event_id values that were successfully synced
 */
export const markAsSynced = async (clientEventIds: string[]): Promise<void> => {
  if (clientEventIds.length === 0) return;

  const db = await initDB();
  for (const id of clientEventIds) {
    db.run('UPDATE offline_checkins SET synced = 1 WHERE client_event_id = ?', [id]);
  }
  saveToLocalStorage();
};

/**
 * Get count of pending (unsynced) check-in records.
 * Useful for displaying a badge/counter in the UI.
 */
export const getPendingCount = async (): Promise<number> => {
  const db = await initDB();
  const res = db.exec('SELECT COUNT(*) as count FROM offline_checkins WHERE synced = 0');
  if (res.length === 0) return 0;
  return res[0].values[0][0] as number;
};
