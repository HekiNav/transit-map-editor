import { SelectableShape } from "../util/shape";
import { Polyline } from "@svgdotjs/svg.js";
import type { ArrayXY } from "@svgdotjs/svg.js";

export class RouteShape extends SelectableShape {
    constructor(points: ArrayXY[], id = crypto.randomUUID()) {
        super(new Polyline().plot(points), id, "route")
    }
}