export const escapeString = (str: string) =>
  str.replace(/'/g, `\'`).replace(/"/g, `\"`);
