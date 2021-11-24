/**
 * Validates the value against the value type
 * @param value
 * @param valueType
 */
import { UserPreferenceValueType } from '@src/common/enums';

export const validateValue = (
  value: string,
  valueType: UserPreferenceValueType
) => {
  if (valueType === UserPreferenceValueType.STRING) {
    return true;
  } else if (valueType === UserPreferenceValueType.INT) {
    return !isNaN(parseInt(value));
  } else if (valueType === UserPreferenceValueType.FLOAT) {
    return !isNaN(parseFloat(value));
  } else if (valueType === UserPreferenceValueType.BOOLEAN) {
    return value === 'true' || value === 'false';
  }

  return false;
};

export const getDefaultPreferenceValue = (
  valueType: UserPreferenceValueType
) => {
  if (valueType === UserPreferenceValueType.STRING) {
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
