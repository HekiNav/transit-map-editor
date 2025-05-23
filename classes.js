class Node {
    constructor(x, y, type = "basicNode", id = crypto.randomUUID()) {
        this.x = x
        this.y = y
        this.type = type
        this.id = id
        this.active = true
        this.selected = false
    }

}
class Stop extends Node {
    constructor(x, y, name, id) {
        super(x, y, "stop", id)
        this.name = name
    }
    static convertFromNode(node, name) {
        return new Stop(node.x, node.y, name, node.id)
    }
}
