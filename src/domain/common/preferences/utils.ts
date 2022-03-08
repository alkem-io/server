/**
 * Validates the value against the value type
 * @param value
 * @param valueType
 */
import { PreferenceValueType } from '@src/common/enums';

export const validateValue = (
  value: string,
  valueType: PreferenceValueType
) => {
  if (valueType === PreferenceValueType.STRING) {
    return true;
  } else if (valueType === PreferenceValueType.INT) {
    return !isNaN(parseInt(value));
  } else if (valueType === PreferenceValueType.FLOAT) {
    return !isNaN(parseFloat(value));
  } else if (valueType === PreferenceValueType.BOOLEAN) {
    return value === 'true' || value === 'false';
  }

  return false;
};

export const getDefaultPreferenceValue = (valueType: PreferenceValueType) => {
  if (valueType === PreferenceValueType.STRING) {
    return '';
  } else if (valueType === PreferenceValueType.INT) {
    return '0';
  } else if (valueType === PreferenceValueType.FLOAT) {
    return '0';
  } else if (valueType === PreferenceValueType.BOOLEAN) {
    return 'false';
  }
  return '';
};
