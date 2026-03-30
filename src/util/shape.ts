import { Element } from "@svgdotjs/svg.js"
import { getSelection, select } from "./selection";
export class SelectableShape {
    element: Element;
    constructor(selected = false, element: Element) {
        this.element = element
        if (selected) select(this.element)
        element.on("click", () => {
            select(this.element)
        })
    }
    get selected() {
        return getSelection().find(el => el == this.element)
    }
}