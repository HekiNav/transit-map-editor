import type { ArrayXY } from "@svgdotjs/svg.js"
import { Element } from "@svgdotjs/svg.js"
import { PAN_ZOOM_OPTIONS } from "../main"
import type { SelectableShape } from "./shape"
const selectedElements: SelectableShape[] = []

const selectionIndicators: SelectionIndicator[] = []

let movingElements: { e: Element, offset: ArrayXY }[] = []

const selectionCont = document.querySelector("#selection")!

window.addEventListener("DOMContentLoaded", async () => {
    const { StopShape } = await import("../shapes/stop")
    const { BasicCircleShape } = await import("../shapes/basic")

    svg.on("select update", () => {
        const selection = getSelection()
        if (selection.length == 0) {
            selectionCont.innerHTML = "No selection"
        } else if (selection.length > 1) {
            selectionCont.innerHTML = `${selection.length} selections`
        } else {
            const selected = selection[0]
            if (selected instanceof StopShape) {
                selectionCont.innerHTML = `
                <div>
                    <span class="font-bold">Stop</span>
                    <div id="stop-search"></div>
                </div>
                `
            } else if (selected instanceof BasicCircleShape) {
                selectionCont.innerHTML = "Circle"
            }
        }
    })
})

export function getSelection() {
    return selectedElements
}

export function clearSelection() {
    selectedElements.length = 0
    svg.fire("select")
    reloadBBs()
}

// fired on click of elements
export function select(el: SelectableShape, reset = true, value?: boolean) {

    if (reset) {
        selectedElements.length = 0
    }

    const index = selectedElements.findIndex(e => e.element == el.element)
    if (index >= 0 && (value == false || value == undefined)) {
        selectedElements.splice(index, 1)
    } else if (index == -1 && (value == true || value == undefined)) {
        selectedElements.push(el)
    }

    reloadBBs()
    svg.fire("select")
}

// reload bounding boxes
export function reloadBBs() {
    selectionIndicators.forEach(el => el.element.remove())

    selectedElements.forEach(el => {
        selectionIndicators.push(new SelectionIndicator(el.element))
    })
}

window.addEventListener("DOMContentLoaded", () => {
    svg.on("mouseup", () => {
        movingElements = []
        if (!svg.data('panZoomEnabled')) {
            svg.panZoom(PAN_ZOOM_OPTIONS)
            svg.data('panZoomEnabled', true)
        }
        setTimeout(() => svg.data("moving", false),1)
    })
    svg.on("mousemove", (ev) => {
        if (movingElements.length) svg.data("moving", true)
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
            svg.panZoom(false)
            svg.data('panZoomEnabled', false)
            movingElements = selectedElements.map(e => ({
                e: e.element,
                offset: [
                    e.element.cx() / scale - (ev as MouseEvent).offsetX,
                    e.element.cy() / scale - (ev as MouseEvent).offsetY
                ]
            }))
        }
        this.element = svg.rect()
            .addClass("ns")
            .addClass("nu")
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