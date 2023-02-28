export const escapeString = (str: string) => {
  if (!str || str.length === 0) {
    return '';
  } else {
    return str.replace(/'/g, `\\'`).replace(/"/g, `\\"`);
  }
};
