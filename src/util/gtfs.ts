import Toastify from 'toastify-js'
import { Unzip, UnzipInflate } from "fflate"
import { db, initDb, rawSql } from "../db/init"
import { agencies, calendar, calendarDates, importMeta, patterns, patternStops, routes, stops, type Agency, type Calendar, type CalendarDates, type Pattern, type PatternStops, type Route, type Stop, type StopTime, type Trip } from '../db/schema'
import MiniSearch, { type SearchResult } from 'minisearch'
import type { InferInsertModel } from 'drizzle-orm'

const urlInput: HTMLInputElement = document.querySelector("#gtfs-url")!
const urlInputSubmit = document.querySelector("#gtfs-url-load")!
const fileInput: HTMLInputElement = document.querySelector("#gtfs-file")!
const fileInputName = document.querySelector("#gtfs-file-name")!
const fileInputSubmit = document.querySelector("#gtfs-file-load")!
const gtfsError = document.querySelector("#gtfs-error")!
const gtfsImports = document.querySelector("#gtfs-import-title")!

const gtfsFacts: HTMLDivElement = document.querySelector("#gtfs-facts")!
const gtfsNone: HTMLDivElement = document.querySelector("#gtfs-none")!
const gtfsImport: HTMLDetailsElement = document.querySelector("#gtfs-import")!
const gtfsFeed = document.querySelector("#gtfs-feed")!
const gtfsTime = document.querySelector("#gtfs-time")!
const gtfsRoutes = document.querySelector("#gtfs-routes")!
const gtfsStops = document.querySelector("#gtfs-stops")!
const gtfsTrips = document.querySelector("#gtfs-trips")!

export const routeSearch = new MiniSearch<Route>({
    fields: ["route_short_name", "route_long_name", "route_desc"],
    storeFields: ["agency_id", "route_type", "route_url", "route_color", "route_text_color", "route_sort_order", "continuous_pickup", "continuous_drop_off", "route_id", "route_short_name", "route_long_name", "route_desc"],
    idField: "route_id",

})
export const stopSearch = new MiniSearch<Stop>({
    fields: ["stop_code", "stop_name"],
    storeFields: ["stop_lat", "stop_lon", "zone_id", "stop_url", "location_type", "parent_station", "stop_timezone", "wheelchair_boarding", "platform_code", "level_id", "stop_id", "stop_code", "stop_name", "stop_desc", "patterns", "routes"],
    idField: "stop_id"
})

export async function initListeners() {
    gtfsImport.open = true
    fileInputName.textContent = fileInput.files?.item(0) ? fileInput.files[0].name : "No file"

    fileInput.addEventListener("change", () => {
        fileInputName.textContent = fileInput.files?.item(0) ? fileInput.files[0].name : "No file"
    })
    fileInputSubmit.addEventListener("click", () => {
        if (!fileInput.files?.item(0)) return error("No file selected")
        parseGTFS(fileInput.files[0])
    })
    urlInputSubmit.addEventListener("click", async () => {
        let url: URL
        try {
            url = new URL(urlInput.value)
        } catch (_) {
            return error("Invalid URL")
        }

        const toast = Toastify({
            duration: 1000000,
            text: "Loading data",
            className: "text-black! bg-white! border-2 border-black rounded! p-2!",
            style: { background: "white", "box-shadow": "none" }
        })
        toast.showToast()

        const response = await fetch(url)

        const reader = response.body?.getReader();
        if (!reader) return error("Fetch error")

        const contentLength = Number(response.headers.get('Content-Length')) || 0

        let receivedLength = 0;
        let chunks = [];


        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                break;
            }

            chunks.push(value);
            receivedLength += value.length;

            if (toast.toastElement && chunks.length % 10 == 0) toast.toastElement.textContent = `Loading data: ${receivedLength} / ${contentLength} (${Math.round(receivedLength / contentLength * 1000) / 10})%`
        }

        toast.hideToast()

        let chunksAll = new Uint8Array(receivedLength)

        let position = 0;
        for (let chunk of chunks) {
            chunksAll.set(chunk, position)
            position += chunk.length;
        }

        parseGTFS(new File([chunksAll], "gtfs.zip", { type: "application/zip" }))
    })

    await initDb()
    await reloadGTFSFacts()
    await reloadSearches()
}

async function reloadGTFSFacts() {
    const facts = await db.query.importMeta.findFirst()


    gtfsFacts.hidden = !facts || !facts.feed_name
    gtfsNone.hidden = !!facts && !!facts.feed_name
    if (!facts || !facts.feed_name) {
        gtfsImports.textContent = "GTFS Import ❌"
        gtfsImport.open = true
        return
    }
    gtfsImport.open = false
    gtfsImports.textContent = "GTFS Import ✔️"

    gtfsFeed.textContent = facts.feed_name
    gtfsTime.textContent = new Date(facts.imported_at).toISOString()
    gtfsRoutes.textContent = String(facts.route_count)
    gtfsStops.textContent = String(facts.stop_count)
    gtfsTrips.textContent = String(facts.trip_count)
}

async function reloadSearches() {
    stopSearch.removeAll()
    routeSearch.removeAll()
    const stops = await db.query.stops.findMany({
        with: {
            patterns: {
                with: {
                    pattern: true
                }
            }
        }
    })
    const routes = await db.query.routes.findMany()
    await stopSearch.addAllAsync(stops.map(s => ({ ...s, routes: s.patterns.map(p => routes.find(r => r.route_id == p.pattern?.route_id)) })))
    await routeSearch.addAllAsync(routes)
    console.log("SEARCHES INITTED", stops, routes)
}

function error(msg: string) {
    Toastify({
        duration: 1000,
        text: msg,
        className: "text-red-500! bg-white! border-2 border-black rounded! p-2!",
        style: { background: "white", "box-shadow": "none" }
    }).showToast()
    gtfsError.textContent = msg
}
const gtfsTables = [["stops", stops, 0.1], ["routes", routes, 0.08], ["agency", agencies, 0.01], ["calendar", calendar, 0.01], ["calendar_dates", calendarDates, 0.01]] as const

async function parseGTFS(data: File) {

    console.log("START")
    console.time("GTFS-parse")

    let progress = 0
    const toast = Toastify({
        duration: 1000000000,
        text: "Starting (0%)",
        className: "text-black! bg-white! border-2 border-black rounded! p-2!",
        style: { background: "white", "box-shadow": "none" },
    })

    toast.showToast()
    function log(msg: string, prg = -1) {
        if (toast.toastElement) toast.toastElement.innerHTML += `<br>${msg} ${prg >= 0 ? `(${Math.round(prg * 100)}%)` : ""}`
    }
    // clear db
    await rawSql`DELETE FROM shapes`
    await rawSql`DELETE FROM trips`
    await rawSql`DELETE FROM routes`
    await rawSql`DELETE FROM stops`
    await rawSql`DELETE FROM pattern_stops`
    await rawSql`DELETE FROM patterns`
    await rawSql`DELETE FROM agencies`
    await rawSql`DELETE FROM calendar`
    await rawSql`DELETE FROM calendar_dates`
    await rawSql`DELETE FROM import_meta`


    progress += 0.1

    progress += 0.06
    const [stopData, routeData, agencyData, calendarData, calendarDatesData] = await Promise.all(gtfsTables.map(async ([file, table, prg]) => {
        log("Starting table " + file, progress)
        const tableData = await ingestGTFSTable<typeof table>(await importGTFSTable<InferInsertModel<typeof table>>(data, file), table)
        progress += prg
        log("Finished table " + file, progress)
        return tableData
    }))

    log("Parsing trips", progress)
    const tripData = (await importGTFSTable<Trip>(data, "trips"))
    progress += 0.07
    log("Parsing stop_times", progress)
    const stopsByTrip = new Map<string, { stop_id: string, stop_sequence: number }[]>()

    await streamGTFSTable<StopTime>(data, "stop_times", row => {
        let list = stopsByTrip.get(row.trip_id)
        if (!list) stopsByTrip.set(row.trip_id, list = [])
        list.push({ stop_id: row.stop_id, stop_sequence: Number(row.stop_sequence) })
    })
    progress += 0.17

    if (stopData === null || routeData === null || agencyData === null || !tripData) return

    log("Processing patterns", progress)

    const now = new Date()
    const timezone = (agencyData[0] as Agency).agency_timezone
    const parts = new Intl.DateTimeFormat("en", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "long"
    }).formatToParts(now)

    const getPart = (type: string) => parts.find(p => p.type === type)!.value

    const today = `${getPart("year")}${getPart("month")}${getPart("day")}`
    const weekday = getPart("weekday").toLowerCase() as "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"

    const activeServices = new Set<string>();
    (calendarData as Calendar[]).forEach(c => {
        if (c.start_date <= today && c.end_date >= today && Number(c[weekday]) === 1) {
            activeServices.add(c.service_id)
        }
    });

    (calendarDatesData as CalendarDates[]).forEach(c => {
        if (c.date === today) {
            if (Number(c.exception_type) == 1) {
                activeServices.add(c.service_id)
            } else if (Number(c.exception_type) == 2) {
                activeServices.delete(c.service_id)
            }
        }
    })


    const patternData: { pattern: Pattern, stops: PatternStops[], route: Route }[] = tripData.reduce<{ pattern: Pattern, stops: PatternStops[], route: Route }[]>((p, c) => {
        const stops = stopsByTrip.get(c.trip_id)
        if (!stops) return p
        if (p.some(e => e.stops.every((s, i) => stops.length > i && s.stop_id == stops[i].stop_id))) return p
        const { trip_id, ...pattern } = c
        return [...p, { pattern: { ...pattern, pattern_id: trip_id }, stops: stops.map<PatternStops>(s => ({ stop_id: s.stop_id, pattern_id: trip_id, stop_sequence: s.stop_sequence })), route: routeData.find(r => (r as Route).route_id == pattern.route_id)! as Route }]
    }, new Array<{ pattern: Pattern, stops: PatternStops[], route: Route }>())
    progress += 0.18

    log("Pushing patterns to db", progress)
    await batchInsert(patternStops, patternData.flatMap(p => p.stops))
    await batchInsert(patterns, patternData.map(p => p.pattern))
    progress += 0.18


    await db.insert(importMeta).values({
        feed_name: data.name,
        imported_at: Date.now(),
        file_size_bytes: data.size,
        stop_count: stopData.length,
        route_count: routeData.length,
        trip_count: patternData.length
    })
    progress += 0.02

    log("Reloading UI", progress)
    await reloadGTFSFacts()
    await reloadSearches()
    progress += 0.01
    log("Complete", progress)
    setTimeout(() => toast.hideToast(), 1000)
    console.timeEnd("GTFS-parse")
}
async function importGTFSTable<T>(zip: Blob, fileName: string) {
    const data: T[] = []
    try {
        await streamGTFSTable<T>(zip, fileName, r => { data.push(r as any) })
        return data
    } catch (err) {
        error(String(err))
        return null
    }
}
async function ingestGTFSTable<T extends typeof gtfsTables[number][1]>(result: InferInsertModel<T>[] | null, table: T) {
    if (!result) return null
    await batchInsert(table, result)
    return result
}

export function addSearch(type: "route" | "stop", container: string, selected: Set<string>, setSelected: (id: string) => void) {
    const cont = document.querySelector(container)
    if (!cont) return
    const div = document.createElement("div")
    div.classList.add("w-full", "border-2", "rounded", "p-1")

    const input = document.createElement("input")
    input.classList.add("w-full")
    input.placeholder = "Search for " + type + "s"
    input.value = localStorage.getItem(`last-${type}-query`) || ""
    div.appendChild(input)

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


function parseCsvLine(line: string): string[] {
    const out: string[] = []
    let cur = "", inQuotes = false
    for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (inQuotes) {
            if (ch === '"') {
                if (line[i + 1] === '"') { cur += '"'; i++ } else inQuotes = false
            } else cur += ch
        } else if (ch === '"') inQuotes = true
        else if (ch === ",") { out.push(cur); cur = "" }
        else cur += ch
    }
    out.push(cur)
    return out
}

export async function streamGTFSTable<T>(zip: File | Blob, table: string, onRow: (row: T) => void): Promise<void> {
    const decoder = new TextDecoder()
    let tail = ""
    let headers: string[] | null = null
    let failure: unknown = null
    let done = false

    const handleText = (text: string, final: boolean) => {
        tail += text
        const lines = tail.split(/\r?\n/)
        tail = final ? "" : lines.pop()!
        if (final && lines.length && lines[lines.length - 1] === "") lines.pop()
        for (const line of lines) {
            if (!line) continue
            if (!headers) {
                headers = parseCsvLine(line.replace(/^\uFEFF/, "")).map(h => h.trim())
                continue
            }
            const cells = parseCsvLine(line)
            const row: Record<string, string> = {}
            for (let i = 0; i < headers.length; i++) row[headers[i]] = cells[i] ?? ""
            onRow(row as T)
        }
    }

    const unzip = new Unzip()
    unzip.register(UnzipInflate)
    unzip.onfile = file => {
        if (file.name !== `${table}.txt`) return
        file.ondata = (err, chunk, final) => {
            if (err) { failure = err; return }
            handleText(decoder.decode(chunk, { stream: !final }), final)
            if (final) done = true
        }
        file.start()
    }

    const reader = zip.stream().getReader()
    while (true) {
        const { value, done: eof } = await reader.read()
        if (eof) { unzip.push(new Uint8Array(0), true); break }
        unzip.push(value, false)
        if (failure) throw failure
    }
    if (!done) throw new Error(`${table}.txt not found in zip`)
}

const BATCH_SIZE = 500

async function batchInsert<T extends Record<string, unknown>>(table: Parameters<typeof db.insert>[0], rows: T[]): Promise<void> {
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        await db.insert(table).values(rows.slice(i, i + BATCH_SIZE) as T[]).onConflictDoNothing()
    }
}
