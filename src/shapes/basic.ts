import { SelectableShape } from "../util/shape";
import { Circle } from "@svgdotjs/svg.js";

export class BasicCircleShape extends SelectableShape {
    constructor(pos: {x:number, y:number,r: number}, id = crypto.randomUUID()) {
        super(new Circle({cx: pos.x, cy: pos.y, r: pos.r}), id, "basic_circle", true)
    }
}