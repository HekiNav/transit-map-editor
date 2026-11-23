
export interface Change extends ChangeData {
    undo: () => void
    redo: () => void
}

export interface ChangeData {
    label: string,
    timestamp: number,
}

export class UndoSystem {
    #undoStack: Change[] = []
    #redoStack: Change[] = []
    constructor() {
    }
    logChange(label: string, redo: () => void, undo: () => void) {
        const data: Change = {
            label,
            undo,
            redo,
            timestamp: Date.now()
        }
        redo()
        this.#undoStack.push(data)
        this.#redoStack.length = 0
        svg.fire("history")
    }
    undo(): Change | null {
        const step = this.#undoStack.pop()
        if (!step) return null

        step.undo()

        this.#redoStack.push(step)
        svg.fire("update")
        svg.fire("history")
        return step
    }

    redo(): Change | null {
        const step = this.#redoStack.pop()
        if (!step) return null

        step.redo()

        this.#undoStack.push(step)
        svg.fire("update")
        svg.fire("history")
        return step
    }

    get canUndo(): boolean {
        return this.#undoStack.length > 0
    }
    get canRedo(): boolean {
        return this.#redoStack.length > 0
    }

    get history(): { undo: ChangeData[], redo: ChangeData[] } {
        return { undo: this.#undoStack.map(({label, timestamp}) => ({label, timestamp})), redo: this.#redoStack.map(({label, timestamp}) => ({label, timestamp})) }
    }
    clear(): void {
        this.#undoStack = []
        this.#redoStack = []
    }
}
