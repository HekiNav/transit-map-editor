import { Element } from "@svgdotjs/svg.js"
import { getSelection, select } from "./selection";
import { Eventable } from "./util/event"
import { normalizeAngle } from "./util/math";

export type ShapeType = "basic_circle" | "stop" | "route_section" | "section"

export class SelectableShape extends Eventable<"update" | "remove"> {
    element: Element;
    id: `${string}-${string}-${string}-${string}-${string}`
    #removed: boolean = false
    #rotation: number = 0
    clone: () => SelectableShape
    constructor(el: Element, id: `${string}-${string}-${string}-${string}-${string}`, type: ShapeType, selected = false) {
        super("update", "remove")
        this.clone = () => new SelectableShape(el, id, type, selected)
        let group = svg.findOne("#group-"+type)
        if (!group) group = svg.group().id("group-"+type)
        this.element = svg.group()
            .add(el)
        group.add(this.element)
        if (selected) select(this)

        this.id = id

        this.element.data("type", type)
        graph.elements.set(id, this)
        this.element.id(id)
        this.element.data("in-use", true)

        if (!this.element.data("type")) console.warn("Element has no type: ", this.element.node)
        if (!this.element.id()) console.warn("Element has no ID: ", this.element.node)

        this.element.on("click", (e) => {
            if (svg.data("moving")) return
            select(this, !(e as MouseEvent).shiftKey)
        })
    }
    get selected() {
        return getSelection().some(el => el.element == this.element)
    }
    set selected(new_sel) {
        select(this, new_sel)
    }
    get rotation() {
        return this.#rotation
    }
    set rotation(new_rot) {
        this.#rotation = normalizeAngle(new_rot)
        this.element.children().each(c => !c.hasClass("ns") && c.transform({rotate: new_rot}))
    }
    remove() {
        this.element.remove()
        this.emit("remove")
        graph.elements.delete(this.id)
        this.#removed = true
    }
    // fetch gets the newest reference to the element
    // useful if the element is deleted and re-added (id needs to match)
    fetch() {
        if (!this.#removed) return this
        else return SelectableShape.fetchById<typeof this>(this.id)
    }
    static fetchById<T extends SelectableShape>(id: string): T | null {
        return graph.elements.get(id) as T || null
    }
}
/* export class Arrow extends Eventable<"update"> {
    element: Element;
    constructor(p1: ArrayXY, p2: ArrayXY, w = 4, hW = 2 * w, hL = 2 * w) {
        super("update")
        this.element = new G().addClass("arrow").center(...p1)
        this.element.add(
            svg.line([p1, p2]).stroke({ width: w })
        )
    }
    get selected() {
        return getSelection().some(el => el.element == this.element)
    }
    set selected(new_sel) {
        select(this, new_sel)
    }
} */