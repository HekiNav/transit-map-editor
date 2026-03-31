import { Rect } from "@svgdotjs/svg.js";
import { SelectableShape } from "../util/shape";

export class StopShape extends SelectableShape {
    constructor(pos: { x: number, y: number, w: number, h: number }) {
        super(new Rect().addTo(svg).size(pos.w, pos.h).center(pos.x, pos.y).stroke({color: "#000", width: 2}).fill("#fff").radius(5,5), true)
    }
}