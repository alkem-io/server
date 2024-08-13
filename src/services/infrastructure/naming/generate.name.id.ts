import { NAMEID_LENGTH } from '@common/constants';
import replaceSpecialCharacters from 'replace-special-characters';

export const generateNameId = (base: string): string => {
  // only allow alphanumeric characters and hyphens
  const nameIDExcludedCharacters = /[^a-zA-Z0-9-]/g;
  // replace characters with umlouts etc. to normal characters
  const noSpecialCharacters: string = replaceSpecialCharacters(base)
    // remove all unwanted characters (consult regex for allowed characters)
    .replace(nameIDExcludedCharacters, '')
    .toLowerCase();
  // Clamp to maxed allowed length
  const a = noSpecialCharacters.slice(0, NAMEID_LENGTH);
  // If the nameID is empty, use the current time in milliseconds as a fallback
  return a || new Date().getTime().toString();
};
