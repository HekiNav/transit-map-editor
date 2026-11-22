import { SelectableShape } from "../shape";
import type { PatternWithRoute } from "../db/schema";
import { G } from "@svgdotjs/svg.js";
import { StopShape } from "./stop";
import { RouteSectionShape } from "./route_section"
import { Route } from "../util/route";
import { randomColor } from "../util/color"
import type { ArrayXY } from "@svgdotjs/svg.js";

export class SectionShape extends SelectableShape {
    gtfsIds: Set<string> = new Set<string>()
    start: StopShape
    end: StopShape
    patterns: PatternWithRoute[] = []
    routes: RouteSectionShape[] = []
    path: ArrayXY[] = []
    constructor(start: StopShape, end: StopShape, id = crypto.randomUUID()) {
        super(new G(), id, "section")
        this.start = start
        this.end = end
        this.start.linkSection(this)
        this.end.linkSection(this)
        this.on("remove", () => {
            this.start.unlinkSection(this)
            this.end.unlinkSection(this)
            this.start.off("update", () => this.onupdate())
            this.end.off("update", () => this.onupdate())
        })
        this.start.on("update", () => this.onupdate())
        this.end.on("update", () => this.onupdate())
        this.on("update", () => this.onupdate())
        this.refreshSectionRoutes()
        this.onupdate()
    }
    onupdate() {
        this.#updatePatterns()
    }
    #updatePatterns() {
        const newPatterns = this.start.stops.flatMap(s => s.patterns.map(p => p.pattern!)).filter(p => p && this.end.stops.some(s => s.patterns.some(e => e.pattern_id == p.pattern_id)))
        if (newPatterns.length === this.patterns.length && newPatterns.every((p, i) => this.patterns[i].pattern_id === p.pattern_id)) {
            // no changes, ignore
            this.#updateRoutes()
        } else {
            this.patterns = newPatterns
            this.refreshSectionRoutes()
        }
    }
    refreshSectionRoutes() {
        this.routes.forEach(r => r.remove())
        this.routes.length = 0
        this.patterns.reduce((p, c) => {
            const index = p.findIndex(e => e[0].route_id == c.route_id)
            if (index == -1) return [...p, [c]]
            p[index].push(c)
            return p
        }, new Array<PatternWithRoute[]>()).forEach((p) => {
            if (!graph.routes.has(p[0].route_id)) graph.routes.set(p[0].route_id, new Route(p[0].route_id, p[0].route?.route_long_name!, p[0].route?.route_short_name || undefined, randomColor()))
            const route = graph.routes.get(p[0].route_id)!
            this.routes.push(new RouteSectionShape(this, route, p))
        })
        this.start.regenerateSlots(this)
        this.end.regenerateSlots(this)
        this.#updateRoutes()
    }
    #updateRoutes() {
        this.routes.forEach(r => {
            const start = this.start.getSlot(r.id)
            const end = this.end.getSlot(r.id)
            if (!end || !start) return
            r.points = [[start.x, start.y], [end.x, end.y]]
            r.emit("update")
        })
    }
}