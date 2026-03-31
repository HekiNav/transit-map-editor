import { Element } from "@svgdotjs/svg.js"
import { getSelection, select } from "./selection";
import { G } from "@svgdotjs/svg.js";
import type { ArrayXY } from "@svgdotjs/svg.js";
export class SelectableShape {
    element: Element;
    constructor(el: Element, selected = false) {
        this.element = svg.group()
        .add(el)
        if (selected) select(this.element)
        this.element.on("click", (e) => {
            select(this.element, !(e as MouseEvent).shiftKey)
        })
    }
    get selected() {
        return getSelection().some(el => el == this.element)
    }
    set selected(new_sel) {
        select(this.element, new_sel)
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
        return getSelection().some(el => el == this.element)
    }
    set selected(new_sel) {
        select(this.element, new_sel)
    }
}