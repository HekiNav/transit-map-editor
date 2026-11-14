import { SelectableShape } from "../util/shape";
import type { PatternWithRoute } from "../db/schema";
import { G } from "@svgdotjs/svg.js";
import { StopShape } from "./stop";

export class SectionShape extends SelectableShape {
    gtfsIds: Set<string> = new Set<string>()
    start: StopShape
    end: StopShape
    patterns: PatternWithRoute[] = []
    constructor(start: StopShape, end: StopShape, id = crypto.randomUUID()) {
        super(new G(), id, "section")
        this.start = start
        this.end = end
        this.start.linkSection(this)
        this.end.linkSection(this)
        this.on("remove", () => {
            this.start.unlinkSection(this)
            this.end.unlinkSection(this)
        })
    }
}