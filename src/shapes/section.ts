import { SelectableShape } from "../shape";
import type { PatternWithRoute } from "../db/schema";
import { G } from "@svgdotjs/svg.js";
import { StopShape } from "./stop";
import { RouteSectionShape } from "./route_section"
import { Route } from "../util/route";
import { randomColor } from "../util/color"
import { SectionKeypointShape } from "./section_keypoint"

export class SectionShape extends SelectableShape {
    gtfsIds: Set<string> = new Set<string>()
    start: StopShape
    end: StopShape
    patterns: PatternWithRoute[] = []
    routes: RouteSectionShape[] = []
    keypoints: SectionKeypointShape[] = []
    clone: () => SectionShape
    constructor(start: StopShape, end: StopShape, id = crypto.randomUUID()) {
        super(new G(), id, "section")
        this.clone = () => new SectionShape(start, end, id)
        this.start = start
        this.end = end
        this.start.linkSection(this)
        this.end.linkSection(this)
        this.on("remove", () => {
            this.start.unlinkSection(this)
            this.end.unlinkSection(this)
            this.start.off("update", () => this.onupdate())
            this.end.off("update", () => this.onupdate())
            this.routes.forEach(r => r.remove())
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
        const newPatterns = this.start.stops.flatMap(s => s.patterns.map(p => p.pattern!)).filter(p => {
            const startIndex = p.stops.findIndex(s => this.start.stops.some(e => e.stop_id == s.stop_id))
            const endIndex = p.stops.findIndex(s => this.end.stops.some(e => e.stop_id == s.stop_id))
            const inBetweenStops = p.stops.slice(Math.min(startIndex, endIndex) + 1, Math.min(startIndex, endIndex) + Math.abs(startIndex - endIndex))
            return p && startIndex != -1 && endIndex != -1 && inBetweenStops.every(s => graph.stops.keys().every(e => !e.gtfsIds.has(s.stop_id)))
        })
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
        const minimumSectionLength = (this.routes.length + 1) * config.stop_size
        this.routes.forEach(r => {
            const start = this.start.getSlot(r.id)
            const end = this.end.getSlot(r.id)
            console.log(start, end)
            if (!end || !start) return
            r.points = [
                `M ${start.x},${start.y}`,
                `L ${start.x + start.direction[0] * minimumSectionLength},${start.y + start.direction[1] * minimumSectionLength}`,
                `L ${end.x + end.direction[0] * minimumSectionLength},${end.y + end.direction[1] * minimumSectionLength}`,
                `L ${end.x},${end.y}`,
            ]
            r.emit("update")
        })
    }
}