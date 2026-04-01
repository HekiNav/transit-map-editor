import { SVG } from '@svgdotjs/svg.js'

Object.defineProperty(window, "svg", {
    value: SVG(),
    writable: false
})
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

declare global {
    const svg: Svg
}

export const PAN_ZOOM_OPTIONS = {
    zoomFactor: 0.5,
    zoomMax: 10,
    zoomMin: 0.05,
}

svg.addTo("#map")
    .size(...elementSize("#map").toSizeArr())
    .viewbox(elementSize("#map").toViewbox(0, 0))
    .panZoom(PAN_ZOOM_OPTIONS)


window.addEventListener("resize", () => {
    svg.size(...elementSize("#map").toSizeArr())
})



new BasicCircleShape({ r: 20, x: 100, y: 0 })
new StopShape({ x: 200, y: 0, w: 10, h: 50 })
new Grid()

document.querySelectorAll(".mode-button").forEach((el) => {
    el.addEventListener("click", () => setMode(el.getAttribute("data-mode") || "move"))
})

document.addEventListener("DOMContentLoaded", () => {
    initListeners()
})

svg.on("mode", () => {
    const mode = svg.data("mode")
    clearSelection()
    svg.attr("style", mode == "draw" ? "cursor: crosshair" : "")
    console.log("ujjj")
})

export function setMode(m: string) {
    svg.data("mode", m)
    svg.fire("mode")
}

svg.on("mouseup", (e) => {
    if (!(e as MouseEvent).shiftKey && !svg.data("moving")) {
        clearSelection()
    }
})
window.addEventListener("keyup", (e) => {
    console.log((e as KeyboardEvent).code)
    if ((e as KeyboardEvent).code == "Escape") setMode("move")
    if ((e as KeyboardEvent).code == "KeyM") setMode("move")
    if ((e as KeyboardEvent).code == "KeyD") setMode("draw")
})
