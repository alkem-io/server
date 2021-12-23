import { registerEnumType } from '@nestjs/graphql';

export enum UserPreferenceValueType {
  BOOLEAN = 'boolean',
  INT = 'int',
  FLOAT = 'float',
  STRING = 'string',
}

registerEnumType(UserPreferenceValueType, {
  name: 'UserPreferenceValueType',
});
