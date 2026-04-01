import Toastify from 'toastify-js'
import JSZip from "jszip"
import * as Papa from "papaparse"
import { db, initDb, rawSql } from "../db/init"
import { agencies, importMeta, routes, stops, trips } from '../db/schema'

const urlInput: HTMLInputElement = document.querySelector("#gtfs-url")!
const urlInputSubmit = document.querySelector("#gtfs-url-load")!
const fileInput: HTMLInputElement = document.querySelector("#gtfs-file")!
const fileInputName = document.querySelector("#gtfs-file-name")!
const fileInputSubmit = document.querySelector("#gtfs-file-load")!
const gtfsError = document.querySelector("#gtfs-error")!

const gtfsFacts: HTMLDivElement = document.querySelector("#gtfs-facts")!
const gtfsFeed = document.querySelector("#gtfs-feed")!
const gtfsTime = document.querySelector("#gtfs-time")!
const gtfsRoutes = document.querySelector("#gtfs-routes")!
const gtfsStops = document.querySelector("#gtfs-stops")!
const gtfsTrips = document.querySelector("#gtfs-trips")!

export async function initListeners() {
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
}

async function reloadGTFSFacts() {
    const facts = await db.query.importMeta.findFirst()

    console.log(await db.select().from(importMeta))
    gtfsFacts.hidden = !facts || !facts.feed_name
    if (!facts || !facts.feed_name) return
    gtfsFeed.textContent = facts.feed_name
    gtfsTime.textContent = new Date(facts.imported_at).toISOString()
    gtfsRoutes.textContent = String(facts.route_count)
    gtfsStops.textContent = String(facts.stop_count)
    gtfsTrips.textContent = String(facts.trip_count)
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
async function parseGTFS(data: File) {
    // clear db
    await rawSql`DELETE FROM shapes`
    await rawSql`DELETE FROM trips`
    await rawSql`DELETE FROM routes`
    await rawSql`DELETE FROM stops`
    await rawSql`DELETE FROM agencies`
    await rawSql`DELETE FROM import_meta`

    const toast = Toastify({
        duration: 1000000,
        text: "Parsing data",
        className: "text-black! bg-white! border-2 border-black rounded! p-2!",
        style: { background: "white", "box-shadow": "none" }
    })
    toast.showToast()
    log("Uzipping GTFS", 0)
    function log(msg: string, prg: number) {
        if (toast.toastElement) toast.toastElement.textContent = `Parsing data: ${msg} (${prg * 100})%`
    }
    const zipper = new JSZip()
    try {
        await zipper.loadAsync(data)
    } catch {
        return error("Failed to unzip")
    }

    const gtfsTables: [string, Parameters<typeof db.insert>[0]][] = [["stops", stops], ["routes", routes], ["trips", trips], ["agency", agencies]]
    Promise.all(gtfsTables.map(([file, table], i) => {
        log("Parsing tables: " + file, ((i - 1) / gtfsTables.length * 0.9) + 0.1)
        return importGTFSTable(zipper, file, table)
    })).then(async ([stopCount, routeCount, tripCount]) => {
        log("Complete", 1)
        setTimeout(() => toast.hideToast(), 1000)
        await db.insert(importMeta).values({
            feed_name: data.name,
            imported_at: Date.now(),
            file_size_bytes: data.size,
            stop_count: stopCount,
            route_count: routeCount,
            trip_count: tripCount
        })
        await reloadGTFSFacts()
    }).catch((err) => {
        console.error(err)
        error(err)
    })
}
async function importGTFSTable(zipper: JSZip, fileName: string, table: Parameters<typeof db.insert>[0]) {
    const file = zipper.file(fileName + ".txt") ?? zipper.file(fileName + ".csv")
    console.log(file)
    if (!file) {
        error(`Failed to parse ${fileName}`)
        return 0
    }
    const text = await file.async("text")
    const result = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
        transform: (v) => v.trim(),
    })
    await batchInsert(table, result as any)
    return result.data.length
}

const BATCH_SIZE = 500

async function batchInsert<T extends Record<string, unknown>>(table: Parameters<typeof db.insert>[0], rows: T[]): Promise<void> {
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        await db.insert(table).values(rows.slice(i, i + BATCH_SIZE) as T[]).onConflictDoNothing()
    }
}