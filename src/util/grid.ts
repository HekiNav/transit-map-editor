import type { Box } from "@svgdotjs/svg.js";
import { Rect } from "@svgdotjs/svg.js";
import type { Svg } from "@svgdotjs/svg.js";
import { Pattern } from "@svgdotjs/svg.js";
import { elementSize } from "./html";

export class Grid {
    #element: Rect;
    #pattern: Pattern;
    #size: number;
    constructor(svg: Svg, size = 100, minorLines = 5) {
        this.#element = svg.rect(0, 0)
        this.#element.addTo(svg).opacity(0.7)
        this.#size = size
        this.#pattern = svg.pattern(size, size, (p) => {
            for (let i = 1 / minorLines; i < 1; i += 1 / minorLines) {
                const offset = i * size;
                console.log(offset)
                p.line([offset, 0, offset, size]).stroke({ width: 0, color: "#777" }).id("minorGridLine")
                p.line([0, offset, size, offset]).stroke({ width: 0, color: "#777" }).id("minorGridLine")
            }
            p.rect(size, size).fill("none").stroke({ width: 0, color: "#000" })
        })
        this.#element.fill(this.#pattern)

        const observer = new MutationObserver(() => {
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
        const minorLinesShown = scale <= 1.7
        const majorLinesShown = scale <= 10
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
        this.#element.size(gridBoxSize * size.width, gridBoxSize * size.height)
        this.#element.attr({
            transform: `translate(${Math.floor((box.cx - size.width * scale) / this.#size) * this.#size} ${Math.floor((box.cy - size.height * scale) / this.#size) * this.#size})`
        })
    }
}