import { SelectableShape } from "../util/shape";
import { Polyline } from "@svgdotjs/svg.js";
import type { ArrayXY } from "@svgdotjs/svg.js";
import type { Route } from "../util/route";
import { G } from "@svgdotjs/svg.js";
import type { PatternWithRoute } from "../db/schema";

export class RouteSectionShape extends SelectableShape {
    points: ArrayXY[] = []
    patterns: PatternWithRoute[]
    route: Route
    constructor(route: Route, patterns: PatternWithRoute[], id = crypto.randomUUID()) {
        super(new G(), id, "route_section")
        this.route = route
        this.patterns = patterns
        this.on("update", () => {
            this.element.children().each(c => c.remove())
            this.element.add(new Polyline().plot(this.points).stroke({color: route.color, width: 8, linecap: "round"}))
        })
        svg.on("graph_update", () => this.emit("update"))
    }
}