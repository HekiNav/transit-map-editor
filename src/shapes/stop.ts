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

export class StopShape extends SelectableShape {
    gtfsIds: Set<string> = new Set<string>()
    sections = new Set<SectionShape>()
    stops: StopWithRoutes[] = []
    constructor(pos: { x: number, y: number }, id = crypto.randomUUID()) {
        super(new Rect().size(10, 10).center(pos.x, pos.y).stroke({ color: "#000", width: 2 }).fill("#fff").radius(5, 5), id, "stop", true)
        this.gtfsIds = new Set(this.element.node.getAttribute("gtfs-ids")?.split(",") || [])
        this.#updateStops()
        this.on("modification", () => {
            this.element.children()[0].width(Math.max(this.stops.flatMap(s => s.patterns).length,1) * 10)
        })
        this.on("remove", () => {
            this.sections.forEach(s => s.remove())
        })
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
        }, new Array<AdjacentStop>())
    }
    toggleId(id: string) {
        if (this.gtfsIds.has(id)) this.gtfsIds.delete(id)
        else this.gtfsIds.add(id)
        this.#updateElementGTFSIds()
        this.#updateStops()
    }
    #updateElementGTFSIds() {
        this.element.node.setAttribute("data-gtfs-ids", this.gtfsIds.keys().toArray().join(","))
    }
    linkSection(s: SectionShape) {
        this.sections.add(s)
    }
    unlinkSection(s: SectionShape) {
        this.sections.delete(s)
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
        this.emit("modification")
        svg.fire("update")
        undo.logChange("Update linked stops")
    }
}