import { SelectableShape } from "../shape";
import { Circle } from "@svgdotjs/svg.js";

export class BasicCircleShape extends SelectableShape {
    clone: () => BasicCircleShape
    constructor(pos: {x:number, y:number,r: number}, id = crypto.randomUUID()) {
        super(new Circle({cx: pos.x, cy: pos.y, r: pos.r}), id, "basic_circle", true)
        this.clone = () => new BasicCircleShape(pos, id)
    }
}