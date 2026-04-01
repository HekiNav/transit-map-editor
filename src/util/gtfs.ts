import Toastify from 'toastify-js'
import JSZip from "jszip"
import * as Papa from "papaparse"
import { db, initDb } from "../db/init"
import { agencies, routes, stops } from '../db/schema'

const urlInput: HTMLInputElement = document.querySelector("#gtfs-url")!
const urlInputSubmit = document.querySelector("#gtfs-url-load")!
const fileInput: HTMLInputElement = document.querySelector("#gtfs-file")!
const fileInputName = document.querySelector("#gtfs-file-name")!
const fileInputSubmit = document.querySelector("#gtfs-file-load")!
const savedInputName = document.querySelector("#gtfs-saved-name")!
const savedInputSubmit: HTMLButtonElement = document.querySelector("#gtfs-saved-load")!
const savedInputClear: HTMLButtonElement = document.querySelector("#gtfs-saved-clear")!
const gtfsError = document.querySelector("#gtfs-error")!

export async function initListeners() {
    fileInputName.textContent = fileInput.files?.item(0) ? fileInput.files[0].name : "No file"
    const root = await navigator.storage.getDirectory()
    console.log((root as any).keys())
    if ((await Array.fromAsync((root as any).keys())).some((k: any) => k == "gtfs.sqlite3")) savedInputName.textContent = "Found"
    else {
        savedInputClear.hidden = true
        savedInputSubmit.hidden = true
    }
    fileInput.addEventListener("change", () => {
        fileInputName.textContent = fileInput.files?.item(0) ? fileInput.files[0].name : "No file"
    })
    fileInputSubmit.addEventListener("click", () => {
        if (!fileInput.files?.item(0)) return error("No file selected")
        parseGTFS(fileInput.files[0])
    })
    savedInputSubmit.addEventListener("click", async () => {
        const handle = await root.getFileHandle("gtfs.zip")
        parseGTFS(await handle.getFile())
    })
    urlInputSubmit.addEventListener("click", async () => {
        let url: URL
        try {
            url = new URL(urlInput.value)
        } catch (_) {
            return error("Invalid URL")
        }

        const response = await fetch(url)

        const reader = response.body?.getReader();
        if (!reader) return error("Fetch error")

        const contentLength = Number(response.headers.get('Content-Length')) || 0

        let receivedLength = 0;
        let chunks = [];

        const toast = Toastify({
            duration: 1000000,
            text: "Loading data",
            className: "text-black! bg-white! border-2 border-black rounded! p-2!",
            style: { background: "white", "box-shadow": "none" }
        })
        toast.showToast()

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

        let chunksAll = new Uint8Array(receivedLength);

        parseGTFS(new File([chunksAll], "gtfs.zip"))
    })
    savedInputClear.addEventListener("click", () => {
        clearSavedGTFS()
    })

    initDb()
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

    const gtfsTables: [string, Parameters<typeof db.insert>[0]][] = [["stops", stops], ["routes", routes], ["agency", agencies]]
    Promise.all(gtfsTables.map(([file, table], i) => {
        log("Parsing tables: " + file, ((i - 1) / gtfsTables.length * 0.9) + 0.1)
        return importGTFSTable(zipper, file, table)
    })).then(() => {
        log("Complete", 1)
        setTimeout(() => toast.hideToast(),1000)
    }).catch((err) => {
        console.error(err)
        error(err)
    })
}
async function importGTFSTable(zipper: JSZip, fileName: string, table: Parameters<typeof db.insert>[0]) {
    const file = zipper.file(fileName + ".txt") ?? zipper.file(fileName + ".csv")
    console.log(file)
    if (!file) return error(`Failed to parse ${fileName}`)
    const text = await file.async("text")
    const result = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
        transform: (v) => v.trim(),
    })
    await batchInsert(table, result as any)
}

const BATCH_SIZE = 500

async function batchInsert<T extends Record<string, unknown>>(table: Parameters<typeof db.insert>[0], rows: T[]): Promise<void> {
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        await db.insert(table).values(rows.slice(i, i + BATCH_SIZE) as T[]).onConflictDoNothing()
    }
}

async function clearSavedGTFS() {
    const root = await navigator.storage.getDirectory()
    await root.removeEntry("gtfs.sqlite3")
    savedInputClear.hidden = true
    savedInputSubmit.hidden = true
    savedInputName.textContent = "Not found"
}