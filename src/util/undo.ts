export type ChangeType = "attribute" | "add" | "remove" | "reorder"

export interface ChangeData {
    type: ChangeType,
    label: string,
    timestamp: number
}

export interface AttributeChange {
    type: "attribute",
    target: Element
    name: string,
    oldValue: string | null
    newValue: string | null
}

export interface ChildChange {
    type: "child",
    action: "remove" | "add",
    parent: Element
    element: Element,
    nextSibling: Element | null
}

export type AnyChange = AttributeChange | ChildChange

export interface ChangeStep {
    data: ChangeData,
    changes: AnyChange[]
}

function filterMutationElement(el: HTMLElement) {
    return (
        el.nodeName != "pattern" &&
        el.nodeName != "defs" &&
        !el.classList.contains("nu")
    )
}

export class UndoSystem {
    #undoStack: ChangeStep[] = []
    #redoStack: ChangeStep[] = []
    #pendingChanges: MutationRecord[] = []
    #undoing = false
    #observer: MutationObserver
    constructor() {
        this.#observer = new MutationObserver((mutations) => {
            if (this.#undoing) return
            const filtered = mutations.filter(m => {
                return (
                    (m.target.nodeName != "svg" || m.type != "attributes") &&
                    filterMutationElement(m.target as HTMLElement) &&
                    (m.removedNodes.length == 0 || Array.from(m.removedNodes).every(n => filterMutationElement(n as HTMLElement))) &&
                    (m.addedNodes.length == 0 || Array.from(m.addedNodes).every(n => filterMutationElement(n as HTMLElement)))
                )
            })
            this.#pendingChanges.push(...filtered)
        })
        this.#observer.observe(svg.node, {
            attributes: true,
            childList: true,
            subtree: true
        })
    }
    logChange(label: string) {
        console.log("pending changes:", mutationsToChanges(this.#pendingChanges).length)
        const changes = mergeChanges(mutationsToChanges(this.#pendingChanges))
        console.log("compressed changes:", changes.length)
        const data: ChangeData = {
            label,
            type: getType(this.#pendingChanges),
            timestamp: Date.now()
        }
        this.#undoStack.push({
            changes,
            data
        })
        this.#redoStack.length = 0
        this.#pendingChanges.length = 0
    }
    undo(): ChangeData | null {
        const step = this.#undoStack.pop()
        if (!step) return null

        this.#undoing = true
        try {
            applyUndo(step.changes)
        } finally {
            this.#undoing = false
        }

        this.#redoStack.push(step)
        return step.data
    }

    redo(): ChangeData | null {
        const step = this.#redoStack.pop()
        if (!step) return null

        this.#undoing = true
        try {
            applyRedo(step.changes)
        } finally {
            this.#undoing = false
        }

        this.#undoStack.push(step)
        return step.data
    }

    get canUndo(): boolean {
        return this.#undoStack.length > 0
    }
    get canRedo(): boolean {
        return this.#redoStack.length > 0
    }

    get history(): ChangeData[] {
        return this.#undoStack.map((s) => s.data)
    }
    clear(): void {
        this.#undoStack = []
        this.#redoStack = []
        this.#pendingChanges = []
    }
}

function canMergeAttribute(p: AttributeChange, n: AttributeChange) {
    return (
        p.target === n.target &&
        p.name === n.name &&
        p.newValue === n.oldValue
    )
}
function mergeAttribute(p: AttributeChange, n: AttributeChange): AttributeChange {
    return { ...p, newValue: n.newValue }
}

function getType(mutations: MutationRecord[]) {
    const hasChildList = mutations.some((m) => m.type === 'childList')
    if (hasChildList) {
        const anyAdded = mutations.some((m) => m.addedNodes.length > 0)
        const anyRemoved = mutations.some((m) => m.removedNodes.length > 0)
        if (anyAdded && !anyRemoved) return 'add'
        if (anyRemoved && !anyAdded) return 'remove'
        if (!anyAdded && !anyRemoved) return 'reorder'
    }
    return 'attribute'
}

function mutationsToChanges(mutations: MutationRecord[]): AnyChange[] {
    const changes: AnyChange[] = []

    mutations.forEach(m => {
        if (m.type == "attributes" && m.attributeName && m.target instanceof Element) {
            changes.push({
                type: "attribute",
                name: m.attributeName,
                newValue: m.target.getAttribute(m.attributeName),
                oldValue: m.oldValue,
                target: m.target
            })
        } else if (m.type == "childList" && m.target instanceof Element) {
            m.removedNodes.forEach(n =>
                changes.push({
                    type: "child",
                    action: "remove",
                    element: n as Element,
                    nextSibling: n.nextSibling as Element | null,
                    parent: m.target as Element
                })
            )
            m.addedNodes.forEach(n =>
                changes.push({
                    type: "child",
                    action: "add",
                    element: n as Element,
                    nextSibling: n.nextSibling as Element | null,
                    parent: m.target as Element
                })
            )
        }
    })
    return changes
}


function applyRedo(changes: AnyChange[]): void {
    changes.forEach(change => {
        if (change.type === 'attribute') {
            if (change.newValue === null) {
                change.target.removeAttribute(change.name)
            } else {
                change.target.setAttribute(change.name, change.newValue)
            }
        } else if (change.type === 'child') {
            if (change.action === 'add') {
                const ref = change.nextSibling && change.parent.contains(change.nextSibling)
                    ? change.nextSibling
                    : null
                change.parent.insertBefore(change.element, ref)
            } else {
                if (change.parent.contains(change.element)) {
                    change.parent.removeChild(change.element)
                }
            }
        }
    })
}

function applyUndo(changes: AnyChange[]): void {
    changes.reverse().forEach((change) => {
        if (change.type === 'attribute') {
            if (change.oldValue === null) {
                change.target.removeAttribute(change.name)
            } else {
                change.target.setAttribute(change.name, change.oldValue)
            }
        } else if (change.type === 'child') {
            if (change.action === 'add') {
                change.parent.removeChild(change.element)
            } else {
                const ref = change.nextSibling && change.parent.contains(change.nextSibling)
                    ? change.nextSibling
                    : null
                change.parent.insertBefore(change.element, ref)
            }
        }
    })
}
function mergeChanges(changes: AnyChange[]): AnyChange[] {
    return changes.reduce((prev, curr) => {
        if (curr.type !== "attribute") return [...prev, curr]
        const lastIndex = prev.findLastIndex(c => c.type == "attribute" && c.name == curr.name && c.target == curr.target)
        if (lastIndex < 0) return [...prev, curr]
        const last = prev.splice(lastIndex, 1)[0]
        if (last.type !== 'attribute' || curr.type !== "attribute" || !canMergeAttribute(last, curr)) return [...prev, curr]
        return [...prev, mergeAttribute(last, curr)]
    }, new Array<AnyChange>())
}
