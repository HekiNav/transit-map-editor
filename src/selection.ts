import type { ArrayXY } from "@svgdotjs/svg.js"
import { Element } from "@svgdotjs/svg.js"
import { PAN_ZOOM_OPTIONS } from "./main"
import { SelectableShape } from "./shape"
import { addSearch } from "./ui/stop_search"
import { addSlotEditor } from "./ui/slot_editor"
import { StopShape } from "./shapes/stop"
import { BasicCircleShape } from "./shapes/basic"
import type { Eventable } from "./util/event"
import { SectionShape } from "./shapes/section"
import { addGraphRouteEditor } from "./ui/graph_route_editor"
import { RouteSectionShape } from "./shapes/route_section"
import { radToDeg } from "./util/math"
const selectedElements: SelectableShape[] = []

const selectionIndicators: SelectionIndicator[] = []

let movingElements: { e: Element, s: SelectableShape, offset: ArrayXY, startMouse: ArrayXY }[] = []

const selectionCont = document.querySelector("#selection")!

window.addEventListener("DOMContentLoaded", async () => {
    svg.on("select update", () => {
        onSelection()
    })
})

function onSelection() {
    const selection = getSelection()
    if (selection.length == 0) {
        selectionCont.innerHTML = "No selection"
    } else if (selection.length > 1) {
        if (selection.every(s => s instanceof StopShape)) {
            selectionCont.innerHTML = `
            <div class="font-bold text-lg">${selection.length} Stops</div>
            `
            const button = document.createElement("button")
            button.classList.add("p-1", "border-2", "rounded")
            button.textContent = "Merge stops"
            button.addEventListener("click", () => {
                const [first, ...rest] = selection
                const linkedIds = rest.flatMap(s => {
                    s.remove()
                    return Array.from(s.gtfsIds)
                })
                linkedIds.forEach(id => {
                    first.addId(id)
                })
            })
            selectionCont.appendChild(button)
        } else {
            selectionCont.innerHTML = `${selection.length} selections`
        }
    } else {
        const selected = selection[0]
        if (selected instanceof StopShape) {
            if (!selected.stops) return
            selectionCont.innerHTML = `
                <div class="flex flex-col gap-1 w-full h-full overflow-y-scroll">
                    <div class="font-bold text-lg">Stop</div>
                    <div class="font-bold">Linked stops</div>
                    ${(selected.stops || []).map(s => `
                        <div class="flex flex-row justify-start items-center gap-1 text-nowrap overflow-hidden">
                            ${s.stop_name} ${s.stop_code?.length ? `<span class="text-nowrap bg-neutral-300 px-1 font-sm rounded">${s.stop_code}</span>` : ""} 
                            ${s.platform_code && s.platform_code.replaceAll(" ", "").length > 0 ? `<span class="bg-neutral-300 text-nowrap px-1 font-sm rounded">pl. ${s.platform_code}</span>` : ""}
                            <span class="h-6 shrink overflow-x-scroll flex-nowrap flex w-fit gap-0.5" title="${s.patterns.map(e => e.pattern?.route?.route_short_name).join(",")}" >
                            ${s.patterns?.map(e => `<span class="bg-green-500 px-1 text-xs rounded h-min">${e.pattern?.route?.route_short_name}</span>`).join("") || ""}</span>
                        </div>
                    `).join("")}
                    <div id="stop-search"></div>

                    <div class="font-bold">Stop slots</div>
                    <div id="stop-slots"></div>

                    <div class="font-bold">Routes</div>
                    <div id="stop-routes"></div>

                    <div class="font-bold">Adjacent stops (Click to place)</div>

                </div>
                `
            selected.getAdjacentStops().forEach(s => {
                const item = document.createElement("div")
                item.classList.add("cursor-pointer", "flex", "flex-row", "justify-start", "items-center", "gap-1", "text-nowrap", "p-1", "border-2", "rounded", "overflow-hidden")
                item.innerHTML = `
                    ${s.stop.stop_name} ${s.stop.stop_code?.length ? `<span class="text-nowrap bg-neutral-300 px-1 font-sm rounded">${s.stop.stop_code}</span>` : ""} 
                    ${s.stop.platform_code && s.stop.platform_code.replaceAll(" ", "").length > 0 ? `<span class="bg-neutral-300 text-nowrap px-1 font-sm rounded">pl. ${s.stop.platform_code}</span>` : ""}
                    <span class="h-6 shrink overflow-x-scroll flex-nowrap flex w-fit gap-0.5">${s.patterns?.map(e => `<span class="bg-green-500 px-1 text-xs rounded h-min">${e.route?.route_short_name}</span>`).join("") || ""}</span>
                `
                selectionCont.appendChild(item)
                item.addEventListener("click", () => {
                    let stopElId: ReturnType<typeof crypto.randomUUID> = crypto.randomUUID()
                    let stop = graph.stops.values().find(st => st.gtfsIds.has(s.stop.stop_id))
                    stop?.emit("update")
                    const id = crypto.randomUUID()
                    undo.logChange(`Add stop via AdjacentStop`, () => {
                        if (!stop) {
                            const newStop = new StopShape({ x: selected.position.x, y: selected.position.y + 50 }, stopElId)
                            newStop.toggleId(s.stop.stop_id)
                            new SectionShape(selected, newStop, id)
                        } else {
                            new SectionShape(selected, stop, id)
                        }
                    }, () => {
                        if (!stop) SelectableShape.fetchById(stopElId)?.remove()
                        SelectableShape.fetchById(id)?.remove()
                    })
                })
            })
            addSearch("stop", "#stop-search", selected.gtfsIds, (...ids) => selected.toggleId(...ids))
            addSlotEditor("#stop-slots", () => selected.getAllSlots(), (i, j, s) => {
                selected.setSlot(i, j, s)
            })
            addGraphRouteEditor("#stop-routes", selected.sections.values().flatMap(s => s.routes.flatMap(r => r.route.gtfsId)).toArray())
        } else if (selected instanceof BasicCircleShape) {
            selectionCont.innerHTML = "Circle"
        } else if (selected instanceof RouteSectionShape) {
            select(selected.section, true)
        } else if (selected instanceof SectionShape) {
            selectionCont.innerHTML = `
                <div class="flex flex-col gap-1 w-full h-full overflow-y-scroll">
                    <div class="font-bold text-lg">Section</div>

                    <div class="font-bold">Routes</div>
                    <div id="section-routes"></div>

                </div>
            `
            addGraphRouteEditor("#section-routes", selected.routes.map(r => r.route.gtfsId))

        }
    }
}

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
let bboxListeners: [Function, Eventable<"update">][] = []
export function reloadBBs() {
    selectionIndicators.forEach(el => el.element.remove())
    bboxListeners.forEach(([l, e]) => e.off("update", l))

    selectedElements.forEach(el => {
        let listener = () => reloadBBs
        el.once("update", listener)
        bboxListeners.push([listener, el])
        selectionIndicators.push(new SelectionIndicator(el))
    })
}

window.addEventListener("DOMContentLoaded", () => {
    svg.on("mouseup", ev => {
        if (!svg.data('panZoomEnabled')) {
            svg.panZoom(PAN_ZOOM_OPTIONS)
            svg.data('panZoomEnabled', true)
        }
        let elements = [...movingElements]
        const grid: number = svg.data("grid") || 1
        const scale: number = (svg.data("scale") || 1)
        const mx = (ev as MouseEvent).offsetX
        const my = (ev as MouseEvent).offsetY
        if (svg.data("moving")) undo.logChange(`Moved ${movingElements.length} object${movingElements.length == 1 ? "" : "s"}`, () => {
            elements.forEach(({ s, offset }) => {
                const x = offset[0]
                const y = offset[1];
                s.fetch()!.position = { x: Math.round((mx + x) * scale / grid) * grid, y: Math.round((my + y) * scale / grid) * grid }
            })
        }, () => {
            elements.forEach(({ s, offset, startMouse }) => {
                const x = offset[0] + startMouse[0]
                const y = offset[1] + startMouse[1];
                s.fetch()!.position = { x: Math.round(x * scale / grid) * grid, y: Math.round(y * scale / grid) * grid }
            })
        })
        movingElements.forEach(el => el.s.emit("update"))
        movingElements = []
        setTimeout(() => svg.data("moving", false), 1)
    })
    svg.on("mousemove", (ev) => {
        if (movingElements.length) svg.data("moving", true)
        movingElements.forEach(({ s, offset }) => {
            const grid: number = svg.data("grid") || 1
            const scale: number = (svg.data("scale") || 1)
            const x = Math.round(((ev as MouseEvent).offsetX + offset[0]) * scale / grid) * grid
            const y = Math.round(((ev as MouseEvent).offsetY + offset[1]) * scale / grid) * grid
            s.position = {x, y}
        })
        reloadBBs()
    })
    document.addEventListener("keypress", e => {
        if (e.target != document.body) return
        if (e.code == "KeyR") {
            selectedElements.forEach(el => {
                el.rotation += e.shiftKey ? -(Math.PI * 0.25) : (Math.PI * 0.25)
                el.emit("update")
                reloadBBs()
            })
        }
    })
})

export class SelectionIndicator {
    element: Element
    constructor(el: SelectableShape) {
        const bb = el.bbox
        const setMovingElements = (ev: Event): void => {
            const scale: number = (svg.data("scale") || 1)
            svg.panZoom(false)
            svg.data('panZoomEnabled', false)
            movingElements = selectedElements.map(e => ({
                e: e.element,
                s: e,
                startMouse: [
                    (ev as MouseEvent).offsetX,
                    (ev as MouseEvent).offsetY
                ],
                offset: [
                    e.position.x / scale - (ev as MouseEvent).offsetX,
                    e.position.y / scale - (ev as MouseEvent).offsetY
                ]
            }))
        }
        this.element = svg.rect()
            .addClass("ns")
            .addClass("nu")
            .addTo(el.element)
            .size(bb.w, bb.h)
            .x(bb.x)
            .y(bb.y)
            .rotate(radToDeg(el.rotation))
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