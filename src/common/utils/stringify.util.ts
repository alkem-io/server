export function stringifyWithoutAuthorization(object: any): string {
  return JSON.stringify(object, (key, value) => {
    if (key === 'authorization') {
      return undefined;
    }
    return value;
  });
}
