import { SVG } from '@svgdotjs/svg.js'

Object.defineProperty(window, "svg", {
    value: SVG(),
    writable: false
})
Object.defineProperty(window, "undo", {
    value: new UndoSystem(),
    writable: false
})

declare global {
    const svg: Svg
    const undo: UndoSystem
}
import '@svgdotjs/svg.panzoom.js'
import './style.css'
import "toastify-js/src/toastify.css"
import { elementSize } from './util/html'
import { Grid } from './util/grid'
import { BasicCircleShape } from './shapes/basic'
import { clearSelection } from './util/selection'
import type { Svg } from '@svgdotjs/svg.js'
import { StopShape } from './shapes/stop'
import { initListeners } from "./util/gtfs"
import type { options } from '@svgdotjs/svg.panzoom.js'
import { UndoSystem, type ChangeData } from "./util/undo"
import { save } from './util/save'

const previousEdits = document.querySelector("#previous-edits")!
const futureEdits = document.querySelector("#future-edits")!

export const PAN_ZOOM_OPTIONS: options = {
    zoomFactor: 0.5,
    zoomMax: 10,
    zoomMin: 0.05,
}

svg.addTo("#map")
    .size(...elementSize("#map").toSizeArr())
    .viewbox(elementSize("#map").toViewbox(0, 0))
    .panZoom(PAN_ZOOM_OPTIONS)

svg.data('panZoomEnabled', true)


window.addEventListener("resize", () => {
    svg.size(...elementSize("#map").toSizeArr())
})


// create example
new Grid()

document.querySelectorAll(".mode-button").forEach((el) => {
    el.addEventListener("click", () => setMode(el.getAttribute("data-mode") || "move"))
})

document.addEventListener("DOMContentLoaded", () => {
    initListeners()
    updateHistory()

    new BasicCircleShape({ r: 20, x: 100, y: 0 })
    new BasicCircleShape({ r: 20, x: 100, y: 0 })
    new StopShape({ x: 200, y: 0, w: 10, h: 50 })
    setTimeout(() => {
        undo.logChange("Initted test view")
    }, 100)

    svg.on("history", updateHistory)
})

svg.on("mode", () => {
    const mode = svg.data("mode")
    clearSelection()
    svg.attr("style", mode == "draw" ? "cursor: crosshair" : "")
})

export function setMode(m: string) {
    svg.data("mode", m)
    svg.fire("mode")
}

svg.on("click", (e) => {
    if (!(e as MouseEvent).shiftKey && !svg.data("moving") && e.target == svg.node) {
        clearSelection()
    }
})
window.addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).code == "Escape") setMode("move")
    if ((e as KeyboardEvent).code == "KeyM") setMode("move")
    if ((e as KeyboardEvent).code == "KeyD") setMode("draw")
    if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) {
        clearSelection()
        if (e.shiftKey) {
            const change = undo.redo()
            if (change) console.log('Redid:', change.label)
        } else {
            const change = undo.undo()
            if (change) console.log('Undid:', change.label)
        }
        e.preventDefault()
    }
    if (e.code === 'KeyS' && (e.ctrlKey || e.metaKey)) {
        save()
        e.preventDefault()
    }
})

function updateHistory() {
    const history = undo.history

    previousEdits.innerHTML = ""
    futureEdits.innerHTML = ""

    history.undo.forEach(c => previousEdits.innerHTML += html(c))
    history.redo.reverse().forEach(c => futureEdits.innerHTML += html(c))

    previousEdits.scrollBy({ top: Math.pow(2, 53) })

    function html(c: ChangeData) {
        return `<div class="">${c.label}</div>`
    }
}