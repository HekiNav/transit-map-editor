import { SelectableShape } from "../util/shape";
import type { PatternWithRoute } from "../db/schema";
import { G } from "@svgdotjs/svg.js";
import { StopShape } from "./stop";
import { RouteSectionShape } from "./route_section"
import { Route } from "../util/route";
import { randomColor } from "../util/color"

export class SectionShape extends SelectableShape {
    gtfsIds: Set<string> = new Set<string>()
    start: StopShape
    end: StopShape
    patterns: PatternWithRoute[] = []
    routes: RouteSectionShape[] = []
    constructor(start: StopShape, end: StopShape, id = crypto.randomUUID()) {
        super(new G(), id, "section")
        this.start = start
        this.end = end
        this.start.linkSection(this)
        this.end.linkSection(this)
        this.on("remove", () => {
            this.start.unlinkSection(this)
            this.end.unlinkSection(this)
            this.start.off("modification", () => this.onModification())
            this.end.off("modification", () => this.onModification())
        })
        this.start.on("modification", () => this.onModification())
        this.end.on("modification", () => this.onModification())
    }
    onModification() {
        this.#updatePatterns()
        this.refreshSection()
    }
    #updatePatterns() {
        this.patterns = this.start.stops.flatMap(s => s.patterns.map(p => p.pattern!)).filter(p => p && this.end.stops.some(s => s.patterns.some(e => e.pattern_id == p.pattern_id)))
    }
    refreshSection() {
        this.routes.forEach(r => r.remove())
        this.patterns.forEach((p, i) => {
            if (!graph.routes.has(p.route_id)) graph.routes.set(p.route_id, new Route(p.route_id, randomColor()))
            const route = graph.routes.get(p.route_id)!
            this.routes.push(new RouteSectionShape([
                [Number(this.start.element.x()) + 5 + i * 10, Number(this.start.element.y()) + 5],
                [Number(this.end.element.x()) + 5 + i * 10, Number(this.end.element.y()) + 5]
            ], route))
        })
    }
}