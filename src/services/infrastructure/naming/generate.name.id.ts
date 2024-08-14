import { NAMEID_LENGTH } from '@common/constants';
import replaceSpecialCharacters from 'replace-special-characters';

export const generateNameId = (base: string): string => {
  // only allow alphanumeric characters and hyphens
  const nameIDExcludedCharacters = /[^a-zA-Z0-9-]/g;
  // replace characters with umlouts etc. to normal characters
  let noSpecialCharacters: string = replaceSpecialCharacters(base)
    // remove all unwanted characters (consult regex for allowed characters)
    .replace(nameIDExcludedCharacters, '')
    .toLowerCase();
  if (noSpecialCharacters.length <= 5) {
    noSpecialCharacters = extendBaseID(noSpecialCharacters, 5);
  }
  // Clamp to maxed allowed length
  return noSpecialCharacters.slice(0, NAMEID_LENGTH);
};

const extendBaseID = (base: string, minLength: number): string => {
  let result = base;
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  while (result.length < minLength) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};
