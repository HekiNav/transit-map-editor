import {Eventable} from "./event"
export class Route extends Eventable<"update"> {
    id: string
    gtfsId: string
    color: string
    shortName?: string
    longName: string
    constructor(gtfsId: string, longName: string, shortName?: string,  color = "#f00", id = crypto.randomUUID()) {
        super("update")
        this.shortName = shortName
        this.longName = longName
        this.color = color
        this.id = id
        this.gtfsId = gtfsId
    }
}