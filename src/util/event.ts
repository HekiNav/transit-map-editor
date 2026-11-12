export class Eventable<T extends string> {
    #listeners: Record<T, Set<Function>>
    #onceListeners: Record<T, Set<Function>>
    constructor(...eventTypes: T[]) {
        this.#listeners = Object.fromEntries(eventTypes.map(t => [t, new Set<Function>()])) as Record<T, Set<Function>>
        this.#onceListeners = Object.fromEntries(eventTypes.map(t => [t, new Set<Function>()])) as Record<T, Set<Function>>
    }
    on(...params: [...T[], Function]) {
        const [fn, ...events] = params.reverse() as [Function, ...T[]]
        events.forEach(ev => {
            this.#listeners[ev].add(fn)
        })
    }
    once(...params: [...T[], Function]) {
        const [fn, ...events] = params.reverse() as [Function, ...T[]]
        events.forEach(ev => {
            this.#listeners[ev].add(fn)
        })
    }
    off(...params: [...T[], Function]) {
        const [fn, ...events] = params.reverse() as [Function, ...T[]]
        events.forEach(ev => {
            this.#listeners[ev].delete(fn)
            this.#onceListeners[ev].delete(fn)
        })
    }
    emit(...events: T[]) {
        events.forEach(ev => {
            this.#listeners[ev].forEach(fn => fn())
            this.#onceListeners[ev].forEach(fn => {fn(); this.#onceListeners[ev].delete(fn)})
        })
    }
}