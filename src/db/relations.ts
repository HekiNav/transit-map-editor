import { defineRelations } from "drizzle-orm"
import * as schema from "./schema"

export default defineRelations(schema, (r) => ({
    patterns: {
        stops: r.many.patternStops({
            from: r.patterns.pattern_id,
            to: r.patternStops.pattern_id
        }),
        route: r.one.routes({
            from: r.patterns.route_id,
            to: r.routes.route_id
        })
    },
    routes: {
        patterns: r.many.patterns({
            from: r.routes.route_id,
            to: r.patterns.route_id
        }),
        agency: r.one.agencies({
            from: r.routes.agency_id,
            to: r.agencies.agency_id
        })
    },
    stops: {
        patterns: r.many.patternStops({
            from: r.stops.stop_id,
            to: r.patternStops.stop_id
        })
    }
}))