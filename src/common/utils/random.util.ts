export function generateRandomArraySelection(
  limit: number,
  size: number
): number[] {
  const result = [];
  while (result.length < limit) {
    const r = Math.floor(Math.random() * size);
    if (result.indexOf(r) === -1) result.push(r);
  }
  return result;
}
