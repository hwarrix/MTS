import * as SQLite from 'expo-sqlite'
import NetInfo from '@react-native-community/netinfo'

const DB_NAME = 'medicare_offline.db'

let db: SQLite.SQLiteDatabase | null = null

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME)
    await initSchema(db)
  }
  return db
}

async function initSchema(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS cached_slots (
      id TEXT PRIMARY KEY,
      doctor_id TEXT NOT NULL,
      doctor_name TEXT NOT NULL,
      doctor_specialty TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      is_available INTEGER NOT NULL DEFAULT 1,
      cached_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cached_appointments (
      id TEXT PRIMARY KEY,
      slot_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      patient_name TEXT NOT NULL,
      doctor_id TEXT NOT NULL,
      status TEXT NOT NULL,
      notes TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      cached_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
}

export type CachedSlot = {
  id: string
  doctor_id: string
  doctor_name: string
  doctor_specialty: string
  start_time: string
  end_time: string
  is_available: boolean
  cached_at: string
}

export type CachedAppointment = {
  id: string
  slot_id: string
  patient_id: string
  patient_name: string
  doctor_id: string
  status: string
  notes: string | null
  start_time: string
  end_time: string
  cached_at: string
}

/**
 * Cache today's appointment schedule for the doctor.
 * Replaces existing cached data for a fresh sync.
 */
export async function cacheDoctorSchedule(
  doctorId: string,
  appointments: CachedAppointment[]
): Promise<void> {
  const database = await getDb()
  const now = new Date().toISOString()

  await database.runAsync(
    'DELETE FROM cached_appointments WHERE doctor_id = ?',
    [doctorId]
  )

  for (const appt of appointments) {
    await database.runAsync(
      `INSERT OR REPLACE INTO cached_appointments
       (id, slot_id, patient_id, patient_name, doctor_id, status, notes, start_time, end_time, cached_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [appt.id, appt.slot_id, appt.patient_id, appt.patient_name, appt.doctor_id,
       appt.status, appt.notes ?? null, appt.start_time, appt.end_time, now]
    )
  }

  await database.runAsync(
    'INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)',
    [`last_sync_${doctorId}`, now]
  )
}

/**
 * Get cached appointments for a doctor (used in offline mode).
 */
export async function getCachedSchedule(doctorId: string): Promise<CachedAppointment[]> {
  const database = await getDb()
  const rows = await database.getAllAsync<CachedAppointment>(
    `SELECT * FROM cached_appointments
     WHERE doctor_id = ? AND status = 'scheduled'
     ORDER BY start_time ASC`,
    [doctorId]
  )
  return rows
}

/**
 * Get the last sync timestamp for a doctor.
 */
export async function getLastSyncTime(doctorId: string): Promise<string | null> {
  const database = await getDb()
  const row = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM sync_meta WHERE key = ?',
    [`last_sync_${doctorId}`]
  )
  return row?.value ?? null
}

/**
 * Check if device is currently online.
 */
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch()
  return state.isConnected === true && state.isInternetReachable !== false
}
