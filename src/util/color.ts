export const COLORS = [
    "#dc2626",
    "#f97316",
    "#eab308",
    "#84cc16",
    "#16a34a",
    "#059669",
    "#0ea5e9",
    "#2563eb",
    "#7c3aed",
    "#d946ef",
    "#ec4899"
]
export function randomColor() {
    return COLORS[Math.floor(Math.random() * COLORS.length)]
}