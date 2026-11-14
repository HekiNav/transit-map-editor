import { Element } from "@svgdotjs/svg.js"
import { getSelection, select } from "./selection";
import { Eventable } from "./event"

export type ShapeType = "basic_circle" | "stop" | "route" | "section"

export class SelectableShape extends Eventable<"modification" | "remove"> {
    element: Element;
    constructor(el: Element, id: string, type: ShapeType, selected = false) {
        super("modification", "remove")
        this.element = svg.group()
            .add(el)
        if (selected) select(this)

        this.element.data("type", type)
        this.element.id(id)
        this.element.data("in-use", true)

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
    remove() {
        this.element.remove()
        this.emit("remove")
    }
}
/* export class Arrow extends Eventable<"modification"> {
    element: Element;
    constructor(p1: ArrayXY, p2: ArrayXY, w = 4, hW = 2 * w, hL = 2 * w) {
        super("modification")
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
} */