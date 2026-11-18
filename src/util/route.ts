import {Eventable} from "./event"
export class Route extends Eventable<"update"> {
    id: string
    gtfsId: string
    color: string
    constructor(gtfsId: string, color = "#f00", id = crypto.randomUUID()) {
        super("update")
        this.color = color
        this.id = id
        this.gtfsId = gtfsId
    }
}