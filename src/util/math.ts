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