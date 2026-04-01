import { sqliteTable, text, real, integer, index } from 'drizzle-orm/sqlite-core'

export const stops = sqliteTable('stops', {
    stop_id: text().primaryKey(),
    stop_code: text(),
    stop_name: text().notNull(),
    stop_desc: text(),
    stop_lat: real().notNull(),
    stop_lon: real().notNull(),
    zone_id: text(),
    stop_url: text(),
    location_type: integer().default(0),
    parent_station: text(),
    stop_timezone: text(),
    wheelchair_boarding: integer().default(0),
    platform_code: text(),
    level_id: text(),
},
    (t) => [
        index('stops_parent_station_idx').on(t.parent_station),
        index('stops_location_type_idx').on(t.location_type),
    ],
)

export const routes = sqliteTable('routes', {
    route_id: text().primaryKey(),
    agency_id: text(),
    route_short_name: text(),
    route_long_name: text(),
    route_desc: text(),
    route_type: integer().notNull(),
    route_url: text(),
    route_color: text(),
    route_text_color: text(),
    route_sort_order: integer(),
    continuous_pickup: integer().default(1),
    continuous_drop_off: integer().default(1),
})

export const agencies = sqliteTable('agencies', {
    agency_id: text().primaryKey(),
    agency_name: text().notNull(),
    agency_url: text().notNull(),
    agency_timezone: text().notNull(),
    agency_lang: text(),
    agency_phone: text(),
    agency_fare_url: text(),
    agency_email: text(),
})

export const shapes = sqliteTable('shapes', {
    shape_id: text().notNull(),
    shape_pt_lat: real().notNull(),
    shape_pt_lon: real().notNull(),
    shape_pt_sequence: integer().notNull(),
    shape_dist_traveled: real(),
},
    (t) => [index('shapes_shape_id_idx').on(t.shape_id)],
)

export const trips = sqliteTable('trips', {
    trip_id: text().primaryKey(),
    route_id: text().notNull(),
    service_id: text().notNull(),
    trip_headsign: text(),
    trip_short_name: text(),
    direction_id: integer(),
    block_id: text(),
    shape_id: text(),
    wheelchair_accessible: integer().default(0),
    bikes_allowed: integer().default(0),
},
    (t) => [
        index('trips_route_id_idx').on(t.route_id),
        index('trips_shape_id_idx').on(t.shape_id),
    ],
)

export const importMeta = sqliteTable('import_meta', {
    id: integer().primaryKey({ autoIncrement: true }),
    feed_name: text(),
    imported_at: integer().notNull(),
    file_size_bytes: integer(),
    stop_count: integer(),
    route_count: integer(),
    trip_count: integer(),
    shape_count: integer(),
})

export type Stop = typeof stops.$inferSelect
export type Route = typeof routes.$inferSelect
export type Agency = typeof agencies.$inferSelect
export type Shape = typeof shapes.$inferSelect
export type Trip = typeof trips.$inferSelect
export type ImportMeta = typeof importMeta.$inferSelect