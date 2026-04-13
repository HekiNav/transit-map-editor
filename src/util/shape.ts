import { Element } from "@svgdotjs/svg.js"
import { getSelection, select } from "./selection";
import { G } from "@svgdotjs/svg.js";
import type { ArrayXY } from "@svgdotjs/svg.js";

export type ShapeType = "basic_circle" | "stop" | "route"

export class SelectableShape {
    element: Element;
    constructor(el: Element, id: string, type: ShapeType, selected = false) {
        this.element = svg.group()
            .add(el)
        if (selected) select(this)

        this.element.data("type", type)
        this.element.id(id)

        if (!this.element.data("type")) console.warn("Element has no type: ", this.element.node)
        if (!this.element.id()) console.warn("Element has no ID: ", this.element.node)

        this.element.on("click", (e) => {
            if (svg.data("moving")) return
            select(this, !(e as MouseEvent).shiftKey)
        })
    }
    get selected() {
        return getSelection().some(el => el.element == this.element)
    }
    set selected(new_sel) {
        select(this, new_sel)
    }
}
export class Arrow {
    element: Element;
    constructor(p1: ArrayXY, p2: ArrayXY, w = 4, hW = 2 * w, hL = 2 * w) {
        this.element = new G().addClass("arrow").center(...p1)
        this.element.add(
            svg.line([p1, p2]).stroke({ width: w })
        )
    }
    get selected() {
        return getSelection().some(el => el.element == this.element)
    }
    set selected(new_sel) {
        select(this, new_sel)
    }
}