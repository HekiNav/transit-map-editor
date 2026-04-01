import { SQLocalDrizzle } from 'sqlocal/drizzle'
import { drizzle } from 'drizzle-orm/sqlite-proxy'
import * as schema from './schema'

const { driver, batchDriver, sql } = new SQLocalDrizzle('gtfs.sqlite3')

export const db = drizzle(driver, batchDriver, { schema })

export { sql as rawSql }

export async function initDb(): Promise<void> {
  await sql`PRAGMA journal_mode = WAL`
  await sql`PRAGMA foreign_keys = ON`

  await sql`
    CREATE TABLE IF NOT EXISTS agencies (
      agency_id       TEXT PRIMARY KEY,
      agency_name     TEXT NOT NULL,
      agency_url      TEXT NOT NULL,
      agency_timezone TEXT NOT NULL,
      agency_lang     TEXT,
      agency_phone    TEXT,
      agency_fare_url TEXT,
      agency_email    TEXT
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS stops (
      stop_id             TEXT PRIMARY KEY,
      stop_code           TEXT,
      stop_name           TEXT NOT NULL,
      stop_desc           TEXT,
      stop_lat            REAL NOT NULL,
      stop_lon            REAL NOT NULL,
      zone_id             TEXT,
      stop_url            TEXT,
      location_type       INTEGER DEFAULT 0,
      parent_station      TEXT,
      stop_timezone       TEXT,
      wheelchair_boarding INTEGER DEFAULT 0,
      platform_code       TEXT,
      level_id            TEXT
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS stops_parent_station_idx ON stops (parent_station)`
  await sql`CREATE INDEX IF NOT EXISTS stops_location_type_idx  ON stops (location_type)`

  await sql`
    CREATE TABLE IF NOT EXISTS routes (
      route_id           TEXT PRIMARY KEY,
      agency_id          TEXT,
      route_short_name   TEXT,
      route_long_name    TEXT,
      route_desc         TEXT,
      route_type         INTEGER NOT NULL,
      route_url          TEXT,
      route_color        TEXT,
      route_text_color   TEXT,
      route_sort_order   INTEGER,
      continuous_pickup  INTEGER DEFAULT 1,
      continuous_drop_off INTEGER DEFAULT 1
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS trips (
      trip_id               TEXT PRIMARY KEY,
      route_id              TEXT NOT NULL,
      service_id            TEXT NOT NULL,
      trip_headsign         TEXT,
      trip_short_name       TEXT,
      direction_id          INTEGER,
      block_id              TEXT,
      shape_id              TEXT,
      wheelchair_accessible INTEGER DEFAULT 0,
      bikes_allowed         INTEGER DEFAULT 0
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS trips_route_id_idx ON trips (route_id)`
  await sql`CREATE INDEX IF NOT EXISTS trips_shape_id_idx ON trips (shape_id)`

  await sql`
    CREATE TABLE IF NOT EXISTS shapes (
      shape_id            TEXT NOT NULL,
      shape_pt_lat        REAL NOT NULL,
      shape_pt_lon        REAL NOT NULL,
      shape_pt_sequence   INTEGER NOT NULL,
      shape_dist_traveled REAL,
      PRIMARY KEY (shape_id, shape_pt_sequence)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS shapes_shape_id_idx ON shapes (shape_id)`

  await sql`
    CREATE TABLE IF NOT EXISTS import_meta (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      feed_name        TEXT,
      imported_at      INTEGER NOT NULL,
      file_size_bytes  INTEGER,
      stop_count       INTEGER,
      route_count      INTEGER,
      trip_count       INTEGER,
      shape_count      INTEGER
    )
  `
}