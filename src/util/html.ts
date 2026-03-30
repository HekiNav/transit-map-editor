export function elementSize(selector: string) {
    const {bottom, height, left, right, toJSON, top, width, x, y} = document.querySelector(selector)?.getBoundingClientRect() || new DOMRect(0,0,0,0)
    return {
        toSizeArr: () => [width, height],
        toViewbox: (nx = x, ny = y) => `${nx} ${ny} ${width} ${height}`,
        x,
        y,
        width,
        height,
        toJSON,
        top,
        bottom,
        left,
        right
    }
}