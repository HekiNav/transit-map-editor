import { Element } from "@svgdotjs/svg.js"
const selectedElements: Element[] = []

export function getSelection() {
    return selectedElements
}
export function select(el: Element) {
    const index = selectedElements.findIndex(e => e == el)
    if (index >= 0) {
        selectedElements.splice(index, 1)
    } else {
        selectedElements.push(el)
    }
}