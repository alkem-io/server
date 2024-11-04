import { DeepSelectProperties } from '@src/types';

/**
 * Checks if an object contains only the allowed fields.
 *
 * @template T - The type of the object and allowed fields.
 * @param {T} obj - The object to check.
 * @param {DeepSelectProperties<T>} allowedFields - The allowed fields, which can be a partial and nested structure.
 * @returns {boolean} - Returns true if the object contains only the allowed fields, otherwise false.
 */
export const hasOnlyAllowedFields = <T extends Record<string, any>>(
  obj: T,
  allowedFields: DeepSelectProperties<T>
): boolean => {
  return Object.keys(obj).every(key => {
    const objValue = (obj as any)[key];
    const allowedValue = (allowedFields as any)[key];

    if (typeof objValue === 'object' && objValue !== null) {
      return hasOnlyAllowedFields(objValue, allowedValue || {});
    }
    return key in allowedFields;
  });
};
