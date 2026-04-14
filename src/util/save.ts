import { SVG } from "@svgdotjs/svg.js"
import { saveAs } from "file-saver"
import * as pjson from "../../package.json"
import type { UndoSystem } from "./undo"
export function save() {

    const newSvg = SVG(svg.node.cloneNode(true) as Element)

    newSvg.node.querySelectorAll(".ns").forEach(el => el.remove())
    newSvg.node.querySelectorAll("defs").forEach(el => el.remove())
    const attr_regex = /style|width|height|(data\-.*)/
    newSvg.node.getAttributeNames().forEach(attr => {
        if (attr_regex.test(attr)) newSvg.node.removeAttribute(attr)
    })
    newSvg.data("created-by", `${pjson.name} by ${pjson.author.name} v${pjson.version}`)
    const { x, y, w, h } = newSvg.bbox()
    newSvg.attr("viewBox", `${x} ${y} ${w} ${h}`)
    const blob = new Blob([newSvg.node.outerHTML], { type: "image/svg+xml" })
    saveAs(blob, "map.tm.svg")
}
export function load(file: File, undo: UndoSystem) {
    if ((undo.canRedo || undo.canRedo) && !confirm("Load file and override current map?")) return
    console.log("LOADING")
}