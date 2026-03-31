import '@svgdotjs/svg.panzoom.js'
import './style.css'
import { elementSize } from './util/html'
import { Grid } from './util/grid'
import { BasicCircleShape } from './shapes/basic'
import { clearSelection, getSelection } from './util/selection'
import type { Svg } from '@svgdotjs/svg.js'
import { SVG } from '@svgdotjs/svg.js'

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
Object.defineProperty(window, "svg", {
    value: SVG(),
    writable: false
})

svg.addTo("#map")
    .size(...elementSize("#map").toSizeArr())
    .viewbox(elementSize("#map").toViewbox(0, 0))
    .panZoom({
        zoomFactor: 0.5,
        zoomMax: 10,
        zoomMin: 0.05,
    })


window.addEventListener("resize", () => {
    svg.size(...elementSize("#map").toSizeArr())
})



const circle = new BasicCircleShape({ r: 20, x: 100, y: 0 })
const circle2 = new BasicCircleShape({ r: 20, x: 200, y: 0 })

console.log(getSelection())

new Grid()

svg.on("mouseup", (e) => {
    if (!(e as MouseEvent).shiftKey) clearSelection()
})