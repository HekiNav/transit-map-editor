import { SVG } from '@svgdotjs/svg.js'
import '@svgdotjs/svg.panzoom.js'
import './style.css'
import { elementSize } from './util/html'
import { Grid } from './util/grid'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <div class="w-full h-full flex">
        <div class="sidebar w-80 border-r-3 h-full p-4">
            <h1 class="text-xl">
                Transit map editor
            </h1>
        </div>
        <div class="grow w-full h-full" id="map">
        </div>
    </div>
    `
const svg = SVG()
.addTo("#map")
.size(...elementSize("#map").toSizeArr())
.viewbox(elementSize("#map").toViewbox(0,0))
.panZoom({
    zoomFactor: 0.7
})
svg.rect(100, 100).attr({ fill: '#f06' })

const grid = new Grid(svg)