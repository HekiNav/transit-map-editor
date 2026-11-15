import { SelectableShape } from "../util/shape";
import type { PatternWithRoute } from "../db/schema";
import { G } from "@svgdotjs/svg.js";
import { StopShape } from "./stop";
import { RouteShape } from "./route"

export class SectionShape extends SelectableShape {
    gtfsIds: Set<string> = new Set<string>()
    start: StopShape
    end: StopShape
    patterns: PatternWithRoute[] = []
    routes: RouteShape[] = []
    constructor(start: StopShape, end: StopShape, id = crypto.randomUUID()) {
        super(new G(), id, "section")
        this.start = start
        this.end = end
        this.start.linkSection(this)
        this.end.linkSection(this)
        this.on("remove", () => {
            this.start.unlinkSection(this)
            this.end.unlinkSection(this)
            this.start.off("modification", () => this.refreshSection())
            this.end.off("modification", () => this.refreshSection())
        })
        this.start.on("modification", () => this.refreshSection())
        this.end.on("modification", () => this.refreshSection())
    }
    refreshSection() {
        this.routes.forEach(r => r.remove())
        this.routes.push(new RouteShape([
            [Number(this.start.element.x()) + 5, Number(this.start.element.y()) + 5],
            [Number(this.end.element.x()) + 5, Number(this.end.element.y()) + 5]
        ]))
    }
}