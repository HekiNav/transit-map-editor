import { SVG } from "@svgdotjs/svg.js"
import { saveAs } from "file-saver"
export function save() {

    const newSvg = SVG(svg.node.cloneNode(true) as Element)

    newSvg.node.querySelectorAll(".ns").forEach(el => el.remove())
    const { x, y, w, h } = newSvg.bbox()
    newSvg.attr("viewBox", `${x} ${y} ${w} ${h}`)
    const blob = new Blob([newSvg.node.outerHTML], { type: "image/svg+xml" })
    saveAs(blob, "map.tm.svg")
}