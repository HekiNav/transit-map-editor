import { type StopSlot } from "../shapes/stop"
export function addSlotEditor(element: string, getSlots: () => [StopSlot, StopSlot][], onSlotUpdate: (i: number, j: number, s: StopSlot) => void) {
    const container = document.querySelector<HTMLDivElement>(element)!
    let activeSlot: [number, number] | null = null
    let draggingSlot: [number, number] | null = null
    let tempElement: HTMLDivElement | null = null
    if (!container) return
    container.classList.add("p-1", "border-2", "rounded", "flex", "w-min", "gap-1", "flex-nowrap", "overflow-scroll")
    container.addEventListener("mousedown", (e) => {
        if (activeSlot && activeSlot[0] < getSlots().length) {
            draggingSlot = activeSlot
            tempElement = container.children[activeSlot[0]].children[activeSlot[1]].cloneNode(true) as HTMLDivElement
            if (!tempElement) return
            tempElement.classList.add("absolute", "pointer-events-none", "temp-el")
            container.appendChild(tempElement)
            const rect = tempElement.getBoundingClientRect()
            tempElement.style.left = `${e.clientX - rect.width * 0.5}px`
            tempElement.style.top = `${e.clientY - rect.height * 0.5}px`
        }
    })
    container.addEventListener("mouseup", () => {
        if (tempElement !== null && activeSlot && draggingSlot) {
            const slots = structuredClone(getSlots())
            if (activeSlot[1] !== draggingSlot[1]) {
                slots.map(s =>
                    (draggingSlot && s[draggingSlot[1]] && s[draggingSlot[1]]!.section === slots[draggingSlot[0]][draggingSlot[1]]?.section) ||
                        (activeSlot && s[activeSlot[1]] && slots[activeSlot[0]] && s[activeSlot[1]]!.section === slots[activeSlot[0]][activeSlot[1]]?.section)
                        ? s : null).forEach((f, i) => {
                            if (!f || !activeSlot || !draggingSlot) return
                            const offset = activeSlot[0] - draggingSlot[0]
                            console.log(offset, f, i)
                            onSlotUpdate(i + offset, activeSlot[1], slots[i] ? slots[i][draggingSlot[1]] : null)
                            onSlotUpdate(i, draggingSlot[1], slots[i + offset] ? slots[i + offset][activeSlot[1]] : null)
                        })
            } else {
                onSlotUpdate(...activeSlot, slots[draggingSlot[0]][draggingSlot[1]])
                onSlotUpdate(...draggingSlot, slots[activeSlot[0]] ? slots[activeSlot[0]][activeSlot[1]] : null)
            }

            reload()
            tempElement.remove()
            tempElement = null
            draggingSlot = null
        }
    })
    container.addEventListener("mousemove", e => {
        if (tempElement !== null) {
            const rect = tempElement.getBoundingClientRect()
            tempElement.style.left = `${e.clientX - rect.width * 0.5}px`
            tempElement.style.top = `${e.clientY - rect.height * 0.5}px`
        }
    })
    reload()
    function reload() {
        container.querySelectorAll(":not(.temp-el)").forEach(el => el.remove());
        [...getSlots(), ["new", "new"] as const].forEach((s, i, a) => {
            const col = document.createElement("div")
            col.classList.add("flex", "flex-col", "gap-1")
            s.forEach((d, j) => {
                const slot = document.createElement("div")
                const route = d && d != "new" ? graph.routes.get(d.routes[0]) : null
                slot.classList.add("rounded", "w-10", "h-10", "flex", "items-center", "justify-center", "text-white", "slot-tile")
                slot.style.backgroundColor = d == "new" ? "#ccc" : route?.color || "#999"
                if (d !== "new" && draggingSlot && d) {
                    const dSlot = a[draggingSlot[0]][draggingSlot[1]]
                    if (dSlot && dSlot !== "new" && dSlot.section == d.section) slot.classList.add("border-1", "border-black")
                }
                if (route) slot.style.cursor = "pointer"
                if (d == "new") slot.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#777" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>'
                else if (d) slot.innerHTML = d.routes.map(r => { const e = graph.routes.get(r); return e?.id.slice(0, 2) + "-" + String(j)/* d?.shortName || d?.longName */ }).join("<br>")
                slot.addEventListener("mouseenter", () => { activeSlot = [i, j]; reload() })
                slot.addEventListener("mouseleave", () => { activeSlot = null; reload() })
                col.appendChild(slot)
            })
            container.appendChild(col)
        })
    }
}