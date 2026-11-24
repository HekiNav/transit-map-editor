export function transpose<T>(matrix: T[][]): T[][] {
  return matrix[0].map((_, i) => matrix.map(row => row[i]));
}

export function commonSubsequence(array: string[]) {
  if (array.length == 0) return null
  let sortedArray = (array as [string, ...string[]]).sort()
  let first = sortedArray[0]
  let last = sortedArray.pop()!
  let length = first.length
  let index = 0

  while (index < length && first[index] === last[index])
    index++;
  return first.substring(0, index);
}

export function normalizeAngle(a: number) {
  const pi2 = Math.PI * 2
  return ((a % pi2) + pi2) % pi2
}

export function normalizeAngleDeg(a: number) {
  return ((a % 360) + 360) % 360
}

export function angleToDirection(a: number): [number, number] {
  return [
    Math.cos(a),
    Math.sin(a)
  ]
}

export function angleToDirectionDeg(a: number) {
  return angleToDirection(radToDeg(a))
}

export function degToRad(a: number) {
  return a * (Math.PI / 180)
}

export function radToDeg(a: number) {
  return a / (Math.PI / 180)
}