import { Rect } from "@svgdotjs/svg.js";
import { SelectableShape } from "../util/shape";
import type { Stop, StopWithRoutes } from "../db/schema";
import { db } from "../db/init";
import { transpose } from "../util/math"

export class StopShape extends SelectableShape {
    gtfsIds: Set<string> = new Set<string>()
    stops: StopWithRoutes[] = []
    constructor(pos: { x: number, y: number, w: number, h: number }, id = crypto.randomUUID()) {
        super(new Rect().size(pos.w, pos.h).center(pos.x, pos.y).stroke({ color: "#000", width: 2 }).fill("#fff").radius(5, 5), id, "stop", true)
        this.gtfsIds = new Set(this.element.node.getAttribute("gtfs-ids")?.split(",") || [])
        this.#updateStops()
    }
    getAdjacentStops() {
        const patterns = this.stops.flatMap(s => s.patterns)
        const patternGroups = patterns.reduce((prev, curr) => {
            const index = curr.pattern?.stops.findLastIndex(s => s.stop_id == curr.stop_id && s.stop_sequence == curr.stop_sequence)
            if (!index) return prev
            const remainingStops = curr.pattern?.stops.slice(index + 1, -1)
            if (!remainingStops) return prev
            const endIndex = remainingStops.findIndex(s => new Set(s.stop?.patterns.map(p => p.pattern_id)).difference(new Set(curr.pattern?.stops[index + 1].stop?.patterns.map(p => p.pattern_id))).size != 0)
            const lastStops = remainingStops.slice(0, endIndex + 1)
            const groupIdx = prev.findIndex(g => g[0].lastStops[0].stop_id == lastStops[0].stop_id)
            if (groupIdx < 0) return [...prev, [{ ...curr, lastStops: lastStops.map(s => s.stop).filter(s => s !== null) }]]
            prev[groupIdx].push({ ...curr, lastStops: lastStops.map(s => s.stop).filter(s => s !== null) })
            return prev
        }, new Array<(StopWithRoutes["patterns"][number] & { lastStops: Stop[] })[]>())
        console.log(patternGroups)
        return patternGroups.map(g => transpose(g.map(p => p.lastStops)).reduce<(Stop | null)>((prev, curr) => {
            return !prev || curr.every(s => s.stop_id === curr[0].stop_id) ? curr[0] : prev
        }, null))
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
    }
}