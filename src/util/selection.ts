import type { Box } from "@svgdotjs/svg.js"
import { Rect } from "@svgdotjs/svg.js"
import { Element } from "@svgdotjs/svg.js"
const selectedElements: Element[] = []

const selectionIndicators: SelectionIndicator[] = []

export function getSelection() {
    return selectedElements
}

export function clearSelection() {
    selectedElements.length = 0
    reloadBBs()
}

export function select(el: Element, reset = true, value?: boolean) {

    if (reset) {
        selectedElements.length = 0
    }

    const index = selectedElements.findIndex(e => e == el)
    if (index >= 0 && (value == false || value == undefined)) {
        selectedElements.splice(index, 1)
    } else if (index == -1 && (value == true || value == undefined)) {
        selectedElements.push(el)
    }

    reloadBBs()
}
export function reloadBBs() {
    const bboxes = selectedElements.map(el => el.bbox())

    selectionIndicators.forEach(el => el.element.remove())

    bboxes.forEach(bb => {
        selectionIndicators.push(new SelectionIndicator(bb))
    })
}
export class SelectionIndicator {
    element: Element
    constructor(bb: Box) {
        this.element = svg.group().addClass("ns")
        this.element.addTo(svg)
        const rect = new Rect()
            .addTo(this.element)
            .size(bb.w, bb.h)
            .center(bb.cx, bb.cy)
            .fill("none")
            .stroke({ width: 4, color: "#08f7" })
    }
}