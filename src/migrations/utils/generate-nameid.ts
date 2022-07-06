export const generateNameID = (
  base: string,
  useRandomSuffix = true,
  length = 12
) => {
  const replaceSpecialCharacters = require('replace-special-characters');
  const nameIDExcludedCharacters = /[^a-zA-Z0-9-]/g;
  let randomSuffix = '';
  if (useRandomSuffix) {
    const randomNumber = Math.floor(Math.random() * 10000).toString();
    randomSuffix = `-${randomNumber}`;
  }
  const baseMaxLength = base.slice(0, 20);
  // replace spaces + trim to 25 characters
  const nameID = `${baseMaxLength}${randomSuffix}`.replace(/\s/g, '');
  // replace characters with umlouts etc to normal characters
  const nameIDNoSpecialCharacters: string = replaceSpecialCharacters(nameID);
  // Remove any characters that are not allowed
  return nameIDNoSpecialCharacters
    .replace(nameIDExcludedCharacters, '')
    .toLowerCase()
    .slice(0, length);
};
