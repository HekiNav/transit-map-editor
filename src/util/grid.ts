import type { Box } from "@svgdotjs/svg.js";
import { Rect } from "@svgdotjs/svg.js";
import { Pattern } from "@svgdotjs/svg.js";
import { elementSize } from "./html";

export class Grid {
    element: Rect;
    #pattern: Pattern;
    #size: number;
    #minorLines: number;
    constructor(size = 100, minorLines = 10) {
        this.element = svg.rect(0, 0).addClass("grid").addClass("ns").addClass("nu")
        this.element.addTo(svg).opacity(0.7)
        this.#size = size
        this.#minorLines = minorLines
        this.#pattern = svg.pattern(size, size, (p) => {
            for (let i = 1 / minorLines; i < 1; i += 1 / minorLines) {
                const offset = i * size;
                p.line([offset, 0, offset, size]).stroke({ width: 0, color: "#777" }).id("minorGridLine").addClass("nu")
                p.line([0, offset, size, offset]).stroke({ width: 0, color: "#777" }).id("minorGridLine").addClass("nu")
            }
            p.rect(size, size).fill("none").stroke({ width: 0, color: "#000" }).addClass("nu").id("majorGridLine")
        })
        this.element.fill(this.#pattern)

        const observer = new MutationObserver((changes) => {
            svg.fire("zoom")
            if (changes[0].attributeName?.includes("data-")) return
            this.#updateToViewBox(svg.viewbox())
        })
        observer.observe(svg.node, {
            attributes: true
        })

        this.#updateToViewBox(svg.viewbox())
    }
    #updateToViewBox(box: Box) {
        const size = elementSize("#map")
        const scale = box.w / size.width
        svg.data("scale", scale)
        const minorLinesShown = scale <= 1.7
        const majorLinesShown = scale <= 10
        minorLinesShown ? svg.data("grid", this.#size / this.#minorLines) : svg.data("grid", this.#size)
        this.#pattern.children().forEach(c => {
            if (c.id() == "minorGridLine") {
                c.stroke({ width: 2 * scale })
                minorLinesShown ? c.show() : c.hide()
            } else {
                majorLinesShown ? c.show() : c.hide()
                c.stroke({ width: Math.min(4 * scale, 5) })
            }
        })
        const gridBoxSize = scale * 2
        this.element.size(gridBoxSize * size.width, gridBoxSize * size.height)
        this.element.attr({
            transform: `translate(${Math.floor((box.cx - size.width * scale) / this.#size) * this.#size} ${Math.floor((box.cy - size.height * scale) / this.#size) * this.#size})`
        })
    }
}