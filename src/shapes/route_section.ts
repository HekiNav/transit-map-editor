import { SelectableShape } from "../shape";
import { Polyline } from "@svgdotjs/svg.js";
import type { ArrayXY } from "@svgdotjs/svg.js";
import type { Route } from "../util/route";
import { G } from "@svgdotjs/svg.js";
import type { PatternWithRoute } from "../db/schema";
import type { SectionShape } from "./section";

export class RouteSectionShape extends SelectableShape {
    points: ArrayXY[] = []
    patterns: PatternWithRoute[]
    route: Route
    section: SectionShape
    constructor(section: SectionShape, route: Route, patterns: PatternWithRoute[], id = crypto.randomUUID()) {
        super(new G(), id, "route_section", false)
        this.route = route
        this.patterns = patterns
        this.section = section
        this.on("update", () => {
            this.element.children().each(c => c.remove())
            this.element.add(new Polyline().plot(this.points).stroke({color: route.color, width: config.route_width, linecap: "round"}))
        })
        svg.on("graph_update", () => this.emit("update"))
    }
}