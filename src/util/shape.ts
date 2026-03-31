import { Element } from "@svgdotjs/svg.js"
import { getSelection, select } from "./selection";
export class SelectableShape {
    element: Element;
    constructor(element: Element, selected = false) {
        this.element = element
        if (selected) select(this.element)
        element.on("click", (e) => {
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