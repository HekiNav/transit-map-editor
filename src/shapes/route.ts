import { SelectableShape } from "../util/shape";
import { Polyline } from "@svgdotjs/svg.js";
import type { ArrayXY } from "@svgdotjs/svg.js";

export class StopShape extends SelectableShape {
    constructor(points: ArrayXY[]) {
        super(new Polyline().plot(points))
    }
}