import { Route } from "./route"
import { StopShape } from "../shapes/stop"

export class Graph {
    stops = new Set<StopShape>()
    routes = new Map<string, Route>()
    constructor() {
        
    }
}