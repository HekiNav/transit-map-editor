import { SelectableShape } from "../util/shape";
import { Polyline } from "@svgdotjs/svg.js";
import type { ArrayXY } from "@svgdotjs/svg.js";
import type { Route } from "../util/route";

export class RouteSectionShape extends SelectableShape {
    constructor(points: ArrayXY[], route: Route, id = crypto.randomUUID()) {
        super(new Polyline().plot(points).stroke({color: route.color, width: 8, linecap: "round"}), id, "route_section")
    }
}