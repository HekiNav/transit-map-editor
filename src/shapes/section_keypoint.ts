import { Rect } from "@svgdotjs/svg.js"
import { SelectableShape } from "../shape"
import type { ArrayXY } from "@svgdotjs/svg.js"
export class SectionKeypointShape extends SelectableShape {
    clone: () => SectionKeypointShape
    constructor(pos: ArrayXY, id = crypto.randomUUID()) {
        super(new Rect({ x: pos[0] - 5, y: pos[1] - 5, width: 10, height: 10 }), id, "section_keypoint", false)
        this.clone = () => new SectionKeypointShape(pos, id)
    }
}