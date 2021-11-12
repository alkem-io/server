/**
 * Validates the value against the value type
 * @param value
 * @param valueType
 */
import { UserPreferenceValueType } from '@src/common';

export const validateValue = (
  value: string,
  valueType: UserPreferenceValueType
) => {
  if (UserPreferenceValueType.STRING) {
    return true;
  } else if (valueType === UserPreferenceValueType.INT) {
    return !isNaN(parseInt(value));
  } else if (valueType === UserPreferenceValueType.FLOAT) {
    return !isNaN(parseFloat(value));
  } else if (valueType === UserPreferenceValueType.BOOLEAN) {
    return Boolean(value);
  }

  return false;
};

/**
 * Parses user preference value by value type
 * @param value
 * @param valueType
 * @returns {string|number|boolean|null} On unsupported value type returns *null*
 */
export const parseValue = (
  value: string,
  valueType: UserPreferenceValueType
) => {
  if (UserPreferenceValueType.STRING) {
    return value;
  } else if (valueType === UserPreferenceValueType.INT) {
    return parseInt(value);
  } else if (valueType === UserPreferenceValueType.FLOAT) {
    return parseFloat(value);
  } else if (valueType === UserPreferenceValueType.BOOLEAN) {
    return Boolean(value);
  }

  return null;
};

export const getDefaultPreferenceValue = (
  valueType: UserPreferenceValueType
) => {
  if (UserPreferenceValueType.STRING) {
    return '';
  } else if (valueType === UserPreferenceValueType.INT) {
    return '0';
  } else if (valueType === UserPreferenceValueType.FLOAT) {
    return '0';
  } else if (valueType === UserPreferenceValueType.BOOLEAN) {
    return 'false';
  }
  return '';
};
