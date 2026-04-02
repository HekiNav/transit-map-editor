
export function initUndo() {
    const observer = new MutationObserver((mutations) => {
        const filtered = mutations.filter(m => (
            m.target.nodeName != "svg" &&
            !(m.target as HTMLElement).classList.contains("nu") &&
            !(m.removedNodes.length && Array.from(m.removedNodes).every(n => (n as HTMLElement).classList.contains("nu")))
        ))
        console.log(filtered, svg.data("moving"))
    })
    observer.observe(svg.node, {
        attributes: true,
        childList: true,
        subtree: true
    })
}