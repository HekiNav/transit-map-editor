import { SQLocalDrizzle } from 'sqlocal/drizzle'
import { drizzle } from 'drizzle-orm/sqlite-proxy'
import relations from "./relations"
const { driver, batchDriver, sql } = new SQLocalDrizzle('gtfs.sqlite3')


export const db = drizzle({
	run: async (sql, params) => { await driver(sql, params, 'run') },
	all: async (sql, params) => (await driver(sql, params, 'all')).rows as unknown[][],
	get: async (sql, params) => (await driver(sql, params, 'get')).rows,
	batch: async (queries) => {
		const results = await batchDriver(
			queries.map(({ sql, params, method }) => ({ sql, params, method })),
		)
		return results.map(({ rows }, i) =>
			queries[i].method === 'run' ? undefined : rows,
		)
	},
}, { relations })

export { sql as rawSql }

export async function initDb(): Promise<void> {
	await sql`PRAGMA journal_mode = WAL`
	await sql`PRAGMA foreign_keys = ON`

	await sql`CREATE TABLE IF NOT EXISTS 'agencies' (
	'agency_id' text PRIMARY KEY,
	'agency_name' text NOT NULL,
	'agency_url' text NOT NULL,
	'agency_timezone' text NOT NULL,
	'agency_lang' text,
	'agency_phone' text,
	'agency_fare_url' text,
	'agency_email' text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS 'calendar' (
	'service_id' text PRIMARY KEY,
	'monday' integer NOT NULL,
	'tuesday' integer NOT NULL,
	'wednesday' integer NOT NULL,
	'thursday' integer NOT NULL,
	'friday' integer NOT NULL,
	'saturday' integer NOT NULL,
	'sunday' integer NOT NULL,
	'start_date' text NOT NULL,
	'end_date' text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS 'calendar_dates' (
	'service_id' text PRIMARY KEY,
	'date' text NOT NULL,
	'exception_type' integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS 'import_meta' (
	'id' integer PRIMARY KEY AUTOINCREMENT,
	'feed_name' text,
	'imported_at' integer NOT NULL,
	'file_size_bytes' integer,
	'stop_count' integer,
	'route_count' integer,
	'trip_count' integer,
	'shape_count' integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS 'pattern_stops' (
	'pattern_id' text NOT NULL,
	'stop_id' text NOT NULL,
	'stop_sequence' integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS 'patterns' (
	'pattern_id' text PRIMARY KEY,
	'route_id' text NOT NULL,
	'service_id' text NOT NULL,
	'trip_headsign' text,
	'trip_short_name' text,
	'direction_id' integer,
	'block_id' text,
	'shape_id' text,
	'wheelchair_accessible' integer DEFAULT 0,
	'bikes_allowed' integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS 'routes' (
	'route_id' text PRIMARY KEY,
	'agency_id' text,
	'route_short_name' text,
	'route_long_name' text,
	'route_desc' text,
	'route_type' integer NOT NULL,
	'route_url' text,
	'route_color' text,
	'route_text_color' text,
	'route_sort_order' integer,
	'continuous_pickup' integer DEFAULT 1,
	'continuous_drop_off' integer DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS 'shapes' (
	'shape_id' text NOT NULL,
	'shape_pt_lat' real NOT NULL,
	'shape_pt_lon' real NOT NULL,
	'shape_pt_sequence' integer NOT NULL,
	'shape_dist_traveled' real
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS 'stop_times' (
	'trip_id' text NOT NULL,
	'stop_id' text NOT NULL,
	'stop_sequence' integer NOT NULL,
	'arrival_time' text,
	'departure_time' text,
	'stop_headsign' text,
	'pickup_type' integer DEFAULT 0,
	'drop_off_type' integer DEFAULT 0,
	'shape_dist_traveled' real,
	'timepoint' integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS 'stops' (
	'stop_id' text PRIMARY KEY,
	'stop_code' text,
	'stop_name' text NOT NULL,
	'stop_desc' text,
	'stop_lat' real NOT NULL,
	'stop_lon' real NOT NULL,
	'zone_id' text,
	'stop_url' text,
	'location_type' integer DEFAULT 0,
	'parent_station' text,
	'stop_timezone' text,
	'wheelchair_boarding' integer DEFAULT 0,
	'platform_code' text,
	'level_id' text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS 'trips' (
	'trip_id' text PRIMARY KEY,
	'route_id' text NOT NULL,
	'service_id' text NOT NULL,
	'trip_headsign' text,
	'trip_short_name' text,
	'direction_id' integer,
	'block_id' text,
	'shape_id' text,
	'wheelchair_accessible' integer DEFAULT 0,
	'bikes_allowed' integer DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS 'pattern_stops_trip_id_idx' ON 'pattern_stops' ('pattern_id');--> statement-breakpoint
CREATE INDEX IF NOT EXISTS 'pattern_stops_stop_id_idx' ON 'pattern_stops' ('stop_id');--> statement-breakpoint
CREATE INDEX IF NOT EXISTS 'patterns_route_id_idx' ON 'patterns' ('route_id');--> statement-breakpoint
CREATE INDEX IF NOT EXISTS 'patterns_shape_id_idx' ON 'patterns' ('shape_id');--> statement-breakpoint
CREATE INDEX IF NOT EXISTS 'shapes_shape_id_idx' ON 'shapes' ('shape_id');--> statement-breakpoint
CREATE INDEX IF NOT EXISTS 'stop_times_trip_id_idx' ON 'stop_times' ('trip_id');--> statement-breakpoint
CREATE INDEX IF NOT EXISTS 'stop_times_stop_id_idx' ON 'stop_times' ('stop_id');--> statement-breakpoint
CREATE INDEX IF NOT EXISTS 'stops_parent_station_idx' ON 'stops' ('parent_station');--> statement-breakpoint
CREATE INDEX IF NOT EXISTS 'stops_location_type_idx' ON 'stops' ('location_type');--> statement-breakpoint
CREATE INDEX IF NOT EXISTS 'trips_route_id_idx' ON 'trips' ('route_id');--> statement-breakpoint
CREATE INDEX IF NOT EXISTS 'trips_shape_id_idx' ON 'trips' ('shape_id');
`
}