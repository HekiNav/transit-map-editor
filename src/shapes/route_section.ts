import { SelectableShape } from "../util/shape";
import { Polyline } from "@svgdotjs/svg.js";
import type { ArrayXY } from "@svgdotjs/svg.js";
import type { Route } from "../util/route";
import { G } from "@svgdotjs/svg.js";

export class RouteSectionShape extends SelectableShape {
    points: ArrayXY[] = []
    constructor(route: Route, id = crypto.randomUUID()) {
        super(new G(), id, "route_section")
        this.on("update", () => {
            this.element.children().each(c => c.remove())
            this.element.add(new Polyline().plot(this.points).stroke({color: route.color, width: 8, linecap: "round"}))
        })
    }
}