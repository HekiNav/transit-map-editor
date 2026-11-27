import { Element } from "@svgdotjs/svg.js"
import { getSelection, select } from "./selection";
import { Eventable } from "./util/event"
import { normalizeAngle, radToDeg } from "./util/math";

export type ShapeType = "basic_circle" | "stop" | "route_section" | "section" | "section_keypoint" | "section_keypoint_connector"

export class SelectableShape extends Eventable<"update" | "remove" | "select" | "deselect"> {
    element: Element;
    id: `${string}-${string}-${string}-${string}-${string}`
    #removed: boolean = false
    // radians
    #rotation: number = 0
    #position: { x: number, y: number } = { x: 0, y: 0 }
    #size: { x: number, y: number } = { x: 0, y: 0 }
    #selectable: boolean
    clone: () => SelectableShape
    constructor(el: Element, id: `${string}-${string}-${string}-${string}-${string}`, type: ShapeType, selected = false, selectable = true) {
        super("update", "remove", "select", "deselect")
        this.clone = () => new SelectableShape(el, id, type, selected)
        let group = svg.findOne("#group-" + type)
        if (!group) group = svg.group().id("group-" + type)
        this.element = svg.group()
            .add(el)
        group.add(this.element)
        if (selected) select(this)
        this.#selectable = selectable

        this.id = id

        this.element.data("type", type)
        graph.elements.set(id, this)
        this.element.id(id)
        this.element.data("in-use", true)

        if (!this.element.data("type")) console.warn("Element has no type: ", this.element.node)
        if (!this.element.id()) console.warn("Element has no ID: ", this.element.node)

        if (this.#selectable) this.element.on("click", (e) => {
            if (svg.data("moving")) return
            select(this, !(e as MouseEvent).shiftKey)
        })
        this.#updateTransform()
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
        this.#updateTransform()
    }
    get position() {
        return this.#position
    }
    get center() {
        return { x: this.#position.x + this.#size.x * 0.5, y: this.#position.y + this.#size.y * 0.5 }
    }
    set center(new_center) {
        this.#position = { x: new_center.x - this.centerOffset.x, y: new_center.y - this.centerOffset.y }
        this.#updateTransform()
    }
    get centerOffset() {
        return { x: this.#size.x * 0.5, y: this.#size.y * 0.5 }
    }
    get bbox() {
        return { x: this.#position.x, y: this.#position.y, w: this.#size.x, h: this.#size.y }
    }
    set position(new_pos) {
        this.#position = new_pos
        this.#updateTransform()
    }
    get size() {
        return this.#size
    }
    set size(size) {
        this.#size = size
        this.#updateTransform()
    }
    #updateTransform() {
        this.element.children().each(c => !c.hasClass("ns") && c.transform({ rotate: radToDeg(this.#rotation), origin: this.centerOffset, translate: this.#position }))
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