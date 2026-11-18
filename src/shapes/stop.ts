import { Rect } from "@svgdotjs/svg.js";
import { SelectableShape } from "../util/shape";
import { SectionShape } from "./section";
import type { PatternWithRoute, Stop, StopWithPattern, StopWithRoutes } from "../db/schema";
import { db } from "../db/init";
import { transpose } from "../util/math"

export interface AdjacentStop {
    stop: Stop,
    patterns: PatternWithRoute[]
}
export type StopSlot = {section: string, route: string} | null

export class StopShape extends SelectableShape {
    gtfsIds: Set<string> = new Set<string>()
    sections = new Set<SectionShape>()
    stops: StopWithRoutes[] = []
    #slots: [StopSlot, StopSlot][] = []
    constructor(pos: { x: number, y: number }, id = crypto.randomUUID(),) {
        super(new Rect().size(10, 10).center(pos.x, pos.y).stroke({ color: "#000", width: 2 }).fill("#fff").radius(5, 5), id, "stop", true)
        this.gtfsIds = new Set(this.element.node.getAttribute("gtfs-ids")?.split(",") || [])
        this.#updateStops()
        graph.stops.add(this)
        this.on("remove", () => {
            this.sections.forEach(s => s.remove())
            graph.stops.delete(this)
        })
    }
    setWidth(w: number) {
        this.element.children()[0].width(Math.max(1, w) * 10)
    }
    getAdjacentStops(): AdjacentStop[] {
        const patterns = this.stops.flatMap(s => s.patterns)
        const patternGroups = patterns.reduce((prev, curr) => {
            const index = curr.pattern?.stops.findLastIndex(s => s.stop_id == curr.stop_id && s.stop_sequence == curr.stop_sequence)
            if (!index) return prev
            const lastStops = curr.pattern?.stops.slice(index + 1, curr.pattern.stops.length)
            if (!lastStops || lastStops.length == 0) return prev
            const groupIdx = prev.findIndex(g => g[0].lastStops[0].stop_id == lastStops[0].stop_id)
            if (groupIdx < 0) return [...prev, [{ ...curr, lastStops: lastStops.map(s => s.stop).filter(s => s !== null) }]]
            prev[groupIdx].push({ ...curr, lastStops: lastStops.map(s => s.stop).filter(s => s !== null) })
            return prev
        }, new Array<(StopWithRoutes["patterns"][number] & { lastStops: StopWithPattern[] })[]>()).map(g => g.map(p => {
            const endIndex = p.lastStops.findIndex(s => {
                const thisSet = new Set(s.patterns.map(p => p.pattern_id))
                const baseSet = new Set(g.map(p => p.pattern_id))
                return thisSet.difference(baseSet).size != 0 || baseSet.difference(thisSet).size != 0
            })
            return {
                ...p,
                lastStops: p.lastStops.slice(0, endIndex + 1)
            }
        }))
        const connectedStops = new Set(this.sections.values().flatMap(v => v.start.id === this.id ? v.end.stops : v.start.stops).map(e => e.stop_id))
        return patternGroups.map(g => ({
            stop: transpose(g.map(p => p.lastStops)).reduce<(Stop | null)>((prev, curr) => {
                return curr.every((s) => s && s.stop_id === curr[0].stop_id) ? curr[0] : prev
            }, null) || g[0].lastStops[0],
            patterns: g.map(({ lastStops, ...pattern }) => pattern.pattern!).filter(p => p !== null && p.route !== null)
        })).reduce<AdjacentStop[]>((prev, curr) => {
            const index = prev.findIndex(s => s.stop.stop_id == curr.stop.stop_id)
            if (index != -1) {
                const otherStop = prev.splice(index, 1)[0]
                return [...prev, { stop: curr.stop, patterns: [...otherStop.patterns, ...curr.patterns] }]
            }
            return [...prev, curr]
        }, new Array<AdjacentStop>()).filter(e => !connectedStops.has(e.stop.stop_id))
    }
    toggleId(id: string) {
        if (this.gtfsIds.has(id)) this.gtfsIds.delete(id)
        else this.gtfsIds.add(id)
        this.#updateElementGTFSIds()
        this.#updateStops()
    }
    addId(id: string) {
        this.gtfsIds.add(id)
        this.#updateElementGTFSIds()
        this.#updateStops()
    }
    #updateElementGTFSIds() {
        this.element.node.setAttribute("data-gtfs-ids", this.gtfsIds.keys().toArray().join(","))
    }
    linkSection(s: SectionShape) {
        this.sections.add(s)
        s.routes.forEach(r => this.#slots.push([{section: s.id, route: r.id}, null]))
        this.#updateSlots()
    }
    unlinkSection(s: SectionShape) {
        this.sections.delete(s)
        this.#slots.forEach(g => g.forEach(e => {
            if (e?.section === s.id) e = null
        }))
        this.#updateSlots()
    }
    regenerateSlots(section: SectionShape) {
        this.#slots.forEach((g, i) => g.forEach((e, j) => {
            if (e?.section === section.id) this.#slots[i][j] = null
        }))
        console.log(this.#slots, section)
        section.routes.forEach(r => this.#slots.push([{section: section.id, route: r.id}, null]))
        this.#updateSlots()
    }
    getSlot(route: string) {
        return this.#slots.reduce<null | {x: number, y: number, direction: {x: number, y: number}}>((p,c,i) => {
            const index = c.findIndex(s => s?.route == route)
            if (index == -1 || p !== null) return p
            else return {
                x: Number(this.element.x()) + 5 + 10 * i,
                y: this.element.cy(),
                direction: {
                    x: 0,
                    y: -1
                }
            }
        }, null)
    }
    #updateSlots() {
        this.#slots = this.#slots.filter(([one, two]) => one !== null || two !== null)
        this.sections.forEach(s => s.emit("update"))
        this.setWidth(this.#slots.length)
    }
    async #updateStops() {
        const data = await db.query.stops.findMany({
            where: {
                stop_id: { in: Array.from(this.gtfsIds) }
            },
            with: {
                patterns: {
                    with: {
                        pattern: {
                            with: {
                                route: true,
                                stops: {
                                    with: {
                                        stop: {
                                            with: {
                                                patterns: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            withCache: true
        })
        this.stops = data
        this.emit("update")
        svg.fire("update")
        undo.logChange("Update linked stops")
        this.sections.forEach(s => this.regenerateSlots(s))
    }
}