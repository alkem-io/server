import { NAMEID_MAX_LENGTH, NAMEID_MIN_LENGTH } from '@common/constants';
import replaceSpecialCharacters from 'replace-special-characters';

export const generateNameId = (base: string): string => {
  // only allow alphanumeric characters and hyphens
  const nameIDExcludedCharacters = /[^a-zA-Z0-9-]/g;

  // replace characters with umlouts etc. to normal characters
  let cleanedBase: string = replaceSpecialCharacters(base);

  // Handle firstName-lastName format specifically
  // Replace spaces between words with hyphens to create firstName-lastName format
  cleanedBase = cleanedBase.replace(/\s+/g, '-');

  // remove all unwanted characters (consult regex for allowed characters)
  cleanedBase = cleanedBase.replace(nameIDExcludedCharacters, '').toLowerCase();

  // Generate a 4-digit suffix for uniqueness
  const suffix = generate4DigitSuffix();

  // Calculate max length for base to leave room for suffix (4 digits + 1 hyphen)
  const maxBaseLength = NAMEID_MAX_LENGTH - 5; // Reserve 5 characters for -XXXX

  // Trim the base if it's too long
  if (cleanedBase.length > maxBaseLength) {
    cleanedBase = cleanedBase.slice(0, maxBaseLength);
  }

  // Ensure the base meets minimum requirements
  if (cleanedBase.length === 0) {
    cleanedBase = 'user'; // fallback for empty input
  }

  // Combine base with suffix
  const result = `${cleanedBase}-${suffix}`;

  // Ensure minimum length is met (if needed, extend the base part)
  if (result.length < NAMEID_MIN_LENGTH) {
    const neededLength = NAMEID_MIN_LENGTH - suffix.length - 1; // -1 for the hyphen
    cleanedBase = extendBaseID(cleanedBase, neededLength);
    return `${cleanedBase}-${suffix}`;
  }

  return result;
};
/** generates a random 4-digit numeric suffix for uniqueness */
const generate4DigitSuffix = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
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
