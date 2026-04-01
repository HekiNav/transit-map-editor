import type { ArrayXY } from "@svgdotjs/svg.js"
import { Element } from "@svgdotjs/svg.js"
import { PAN_ZOOM_OPTIONS } from "../main"
const selectedElements: Element[] = []

const selectionIndicators: SelectionIndicator[] = []

let movingElements: { e: Element, offset: ArrayXY }[] = []

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
    selectionIndicators.forEach(el => el.element.remove())

    selectedElements.forEach(el => {
        selectionIndicators.push(new SelectionIndicator(el))
    })
}
window.addEventListener("DOMContentLoaded", () => {
    svg.on("mouseup", () => {
        movingElements = []
        svg.data("moving", false)
        svg.panZoom(PAN_ZOOM_OPTIONS)
    })
    svg.on("mousemove", (ev) => {
        movingElements.forEach(({ e, offset }) => {
            const grid: number = svg.data("grid") || 1
            const scale: number = (svg.data("scale") || 1)
            const x = Math.round(((ev as MouseEvent).offsetX + offset[0]) * scale / grid) * grid
            const y = Math.round(((ev as MouseEvent).offsetY + offset[1]) * scale / grid) * grid
            e.cx(x)
            e.cy(y)
        })
    })
})

export class SelectionIndicator {
    element: Element
    constructor(el: Element) {
        const bb = el.bbox()
        const setMovingElements = (ev: Event): void => {
            const scale: number = (svg.data("scale") || 1)
            svg.data("moving", true)
            svg.panZoom(false)
            console.log(scale)
            movingElements = selectedElements.map(e => ({
                e,
                offset: [
                    e.cx() / scale - (ev as MouseEvent).offsetX,
                    e.cy() / scale - (ev as MouseEvent).offsetY
                ]
            }))
        }
        this.element = svg.rect()
            .addClass("ns")
            .addTo(el)
            .size(bb.w, bb.h)
            .center(bb.cx, bb.cy)
            .fill("#08f1")
            .stroke({ width: 3, color: "#08f7" })
            .attr({ style: "cursor: move" })
            .on("mousedown", (e) => setMovingElements(e))

        /* const arrows = new G()
            .addTo(this.element); */

        /* const arrowPoints: [[number, number], [number, number]][] = [
            [[bb.cx, bb.cy + bb.h * 0.5], [bb.cx, bb.cy + bb.h * 0.75]]
        ]
        arrowPoints.forEach(([p1, p2]) => {
            new Arrow(
                p1,
                p2
            ).element
            .stroke("#08f7")
            .addTo(arrows)
        }) */

    }
}