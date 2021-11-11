import { registerEnumType } from '@nestjs/graphql';

export enum UserPreferenceValueType {
  BOOLEAN = 'boolean',
  NUMBER = 'number',
  STRING = 'string',
}

registerEnumType(UserPreferenceValueType, {
  name: 'UserPreferenceValueType',
});
