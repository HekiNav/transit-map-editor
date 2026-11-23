import { Route } from "./route"
import { StopShape } from "../shapes/stop"
import type { SelectableShape } from "../shape"

export class Graph {
    stops = new Set<StopShape>()
    routes = new Map<string, Route>()
    elements = new Map<string, SelectableShape>()
    constructor() {
        
    }
}