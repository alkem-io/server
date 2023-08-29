export const arrayToMapWithIndex = <T extends { id: string }>(
  elements: readonly T[]
) => {
  return elements.reduce((acc, element: T, idx) => {
    acc.set(element.id, [element, idx]);
    return acc;
  }, new Map<string, [T, number]>());
};
