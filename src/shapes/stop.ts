import { Rect } from "@svgdotjs/svg.js";
import { SelectableShape } from "../util/shape";
import type { StopWithRoutes } from "../db/schema";
import { db } from "../db/init";

export class StopShape extends SelectableShape {
    gtfsIds: Set<string> = new Set<string>()
    stops: StopWithRoutes[] = []
    constructor(pos: { x: number, y: number, w: number, h: number }, id = crypto.randomUUID()) {
        super(new Rect().size(pos.w, pos.h).center(pos.x, pos.y).stroke({color: "#000", width: 2}).fill("#fff").radius(5,5), id, "stop", true)
        this.gtfsIds = new Set(this.element.node.getAttribute("gtfs-ids")?.split(",") || [])
        this.#updateStops()
    }
    toggleId(id: string) {
        console.log(id)
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
                stop_id: {in: Array.from(this.gtfsIds)}
            },
            with: {
                patterns: {
                    with: {
                        pattern: {
                            with: {
                                route: true,
                                stops: true
                            }
                        }
                    }
                }
            },
            withCache: true
        })
        this.stops = data
        console.log(this.stops)
    }
}