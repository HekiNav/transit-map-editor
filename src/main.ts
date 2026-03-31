import { SVG } from '@svgdotjs/svg.js'

Object.defineProperty(window, "svg", {
    value: SVG(),
    writable: false
})
import '@svgdotjs/svg.panzoom.js'
import './style.css'
import { elementSize } from './util/html'
import { Grid } from './util/grid'
import { BasicCircleShape } from './shapes/basic'
import { clearSelection, getSelection } from './util/selection'
import type { Svg } from '@svgdotjs/svg.js'
import { StopShape } from './shapes/stop'

declare global {
    const svg: Svg
}

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <div class="w-full h-full flex">
        <div class="sidebar w-80 border-r-3 h-full p-4">
            <h1 class="text-xl">
                Transit map editor
            </h1>
        </div>
        <div class="grow w-full h-full overflow-hidden" id="map">
        </div>
    </div>
    `
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
new StopShape({ x: 200, y: 0, w: 10, h: 50})

console.log(getSelection())

new Grid()

svg.on("mouseup", (e) => {
    if (!(e as MouseEvent).shiftKey && !svg.data("moving")) {
        clearSelection()
    }
})