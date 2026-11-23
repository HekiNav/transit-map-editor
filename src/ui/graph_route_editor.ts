import Coloris from "@melloware/coloris"
import { COLORS } from "../util/color"
import { transpose } from "../util/math"
Coloris.init()

export function addGraphRouteEditor(selector: string, routes: string[]) {
    const container = document.querySelector<HTMLDivElement>(selector)
    if (!container) return
    routes.forEach(id => {
        const route = graph.routes.get(id)
        if (!route) return
        const item = document.createElement("div")
        item.classList.add("my-1", "border-2", "rounded", "p-1", "w-full")

        const title = document.createElement("h3")
        title.classList.add("font-lg", "font-bold", "truncate")
        title.textContent = route.shortName || route.longName
        item.appendChild(title)

        item.innerHTML += `<label class="mr-2" for="color-picker-${route.gtfsId}">Color:</label><input id="color-picker-${route.gtfsId}" class="w-8!" value="${route.color}" type="text" data-coloris>`
        container.appendChild(item)

        Coloris({
            el: `#color-picker-${route.gtfsId}`,
            swatches: transpose(COLORS).flat(),
            alpha: false,
            onChange: c => {
                const route = graph.routes.get(id)!
                let prev_color = route.color
                undo.logChange(`Change color of route ${route.shortName || route.longName}`, () => {
                    graph.routes.get(id)!.color = c
                    svg.fire("graph_update")
                }, () => {
                    graph.routes.get(id)!.color = prev_color
                    svg.fire("graph_update")
                })

            }
        })

    })
}