import { Rect } from "@svgdotjs/svg.js"
import { SelectableShape } from "../shape"
import { Line } from "@svgdotjs/svg.js"
export class SectionKeypointShape extends SelectableShape {
    clone: () => SectionKeypointShape
    locked = false
    constructor(pos: {x: number, y: number}, id = crypto.randomUUID()) {
        super(new Rect({ width: 10, height: 10 }).fill("#0f87").attr({ style: "cursor: move" }), id, "section_keypoint", false, false)
        this.clone = () => new SectionKeypointShape(pos, id)
        this.center = pos
    }
}

export class SectionKeypointConnector extends SelectableShape {
    clone: () => SectionKeypointConnector
    constructor(p1: SectionKeypointShape, p2: SectionKeypointShape, id = crypto.randomUUID()) {
        super(new Line().plot([p1.center.x, p1.center.y, p2.center.x, p2.center.y]).stroke({color: "#0f87", width: 4}), id, "section_keypoint_connector", false, false)
        this.clone = () => new SectionKeypointConnector(p1, p2, id)
    }
}