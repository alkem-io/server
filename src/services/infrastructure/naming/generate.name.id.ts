import { NAMEID_MAX_LENGTH, NAMEID_MIN_LENGTH } from '@common/constants';
import replaceSpecialCharacters from 'replace-special-characters';

export const generateNameId = (base: string): string => {
  // only allow alphanumeric characters and hyphens
  const nameIDExcludedCharacters = /[^a-zA-Z0-9-]/g;
  // replace characters with umlouts etc. to normal characters
  let noSpecialCharacters: string = replaceSpecialCharacters(base)
    // remove all unwanted characters (consult regex for allowed characters)
    .replace(nameIDExcludedCharacters, '')
    .toLowerCase();
  if (noSpecialCharacters.length < NAMEID_MIN_LENGTH) {
    noSpecialCharacters = extendBaseID(noSpecialCharacters, NAMEID_MIN_LENGTH);
  }
  // Clamp to max allowed length
  return noSpecialCharacters.slice(0, NAMEID_MAX_LENGTH);
};
/** extends a string with random alphanumeric characters until it reaches the desired length */
const extendBaseID = (base: string, desiredLength: number): string => {
  let result = base;
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  while (result.length < desiredLength) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};
