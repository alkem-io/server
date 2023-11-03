/**
 * Matches a string to an enum member name and its corresponding value within a given TypeScript enum.
 *
 * @param {any} enumType - The TypeScript enum for which you want to find a match.
 * @param {string} inputString - The input string that you want to match against the enum's values.
 * @returns {{ key: string, value: any } | null} An object with matched enum member name and value, or null if no match is found.
 *
 * @example
 * // Define an enum
 * enum MyEnum {
 *   Option1 = 'Value1',
 *   Option2 = 'Value2',
 *   Option3 = 'Value3',
 * }
 *
 * // Match the input string 'Value2' against the MyEnum enum
 * const inputString = 'Value2';
 * const matchResult = matchEnumString(MyEnum, inputString);
 *
 * if (matchResult) {
 *   console.log(`Matched Enum Name: ${matchResult.key}, Enum Value: ${matchResult.value}`);
 * } else {
 *   console.log('No match found.');
 * }
 */
export function matchEnumString(
  enumType: any,
  inputString: string
): { key: string; value: any } | null {
  for (const key of Object.keys(enumType)) {
    if (enumType[key] === inputString) {
      return { key, value: enumType[key] };
    }
  }
  return null; // Return null if no match is found
}
