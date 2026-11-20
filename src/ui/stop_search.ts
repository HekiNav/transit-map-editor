import { type SearchResult } from "minisearch"
import { db } from "../db/init"
import { routeSearch, stopSearch } from "../util/gtfs"
import { commonSubsequence } from "../util/math"
import { type Route, type Stop } from "../db/schema"

export async function addSearch(type: "stop", container: string, selected: Set<string>, setSelected: (id: string) => void) {
    const selectedData = await db.query.stops.findMany({where: {stop_id: {in: Array.from(selected.values())}}})
    const cont = document.querySelector(container)
    if (!cont) return
    const div = document.createElement("div")
    div.classList.add("w-full", "border-2", "rounded", "p-1", "relative")

    const input = document.createElement("input")
    input.classList.add("w-full", "search-box")
    input.placeholder = "Search for " + type + "s"
    input.value = localStorage.getItem(`last-${type}-query`) || ""
    div.appendChild(input)

    const buttonContainer = document.createElement("button")
    buttonContainer.classList.add("absolute", "p-1", "top-0", "right-0")
    div.appendChild(buttonContainer)

    const fillStopName = document.createElement("button")
    fillStopName.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#000" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25" /></svg>'
    fillStopName.addEventListener("click", () => {input.value = commonSubsequence(selectedData.map(s => s.stop_name)) || input.value; onInput()})
    buttonContainer.appendChild(fillStopName)

    const clearButton = document.createElement("button")
    clearButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#000" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>'
    clearButton.addEventListener("click", () => {input.value = ""; onInput()})
    buttonContainer.appendChild(clearButton)

    const resultList = document.createElement("div")
    resultList.classList.add("flex", "w-full", "gap-1", "flex-col")
    div.appendChild(resultList)

    input.addEventListener("input", onInput)

    cont.appendChild(div)

    onInput()

    function onInput() {
        const query = input.value
        localStorage.setItem(`last-${type}-query`, query)
        resultList.innerHTML = ""
        if (query.length >= 2) {
            const searcher = (type == "stop" ? stopSearch : routeSearch)
            const results: SearchResult[] = searcher.search(query, {
                fuzzy: 0.2,
                prefix: true,
            })
            updateResults(results)
        }
    }

    function updateResults(results: SearchResult[]) {
        resultList.innerHTML = ""
        results.slice(0, 10).forEach((r) => {
            const item = document.createElement("div")
            item.classList.add("search-item", "flex", "flex-row", "justify-start", "items-center", "gap-1", "text-nowrap")
            let id = ""
            if (type == "stop") {
                const stop = r as any as Stop & { routes: Route[] }
                item.setAttribute("data-id", stop.stop_id)
                id = stop.stop_id
                item.innerHTML = `
                <input type="checkbox" class="h-4! w-4! checked:bg-green-500 rounded border-2 appearance-none disabled" ${selected.has(stop.stop_id) ? "checked" : ""}>
                ${stop.stop_name} ${stop.stop_code?.length ? `<span class="text-nowrap bg-neutral-300 px-1 font-sm rounded">${stop.stop_code}</span>` : ""} 
                ${stop.platform_code && stop.platform_code.replaceAll(" ", "").length > 0 ? `<span class="bg-neutral-300 text-nowrap px-1 font-sm rounded">pl. ${stop.platform_code}</span>` : ""}
                <span class="h-full shrink overflow-x-scroll flex-nowrap flex w-fit gap-0.5" title="${stop.routes.map(e => e.route_short_name).join(",")}" >${stop.routes?.map(e => `<span class="bg-green-500 px-1 text-xs rounded">${e.route_short_name}</span>`).join("") || ""}</span>
                `
            } else {
                const route = r as any as Route
                id = route.route_id
                item.innerHTML = `${route.route_short_name} ${route.route_long_name}`
            }
            item.addEventListener("click", () => {
                setSelected(id)
                updateResults(results)
            })
            resultList.appendChild(item)
        })
    }
}