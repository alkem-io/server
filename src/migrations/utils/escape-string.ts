export const escapeString = (str: string) =>
  str.replace(/'/g, `\'`).replaceAll(/"/g, `\"`);
