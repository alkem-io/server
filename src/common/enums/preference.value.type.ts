import { registerEnumType } from '@nestjs/graphql';

export enum PreferenceValueType {
  BOOLEAN = 'boolean',
  INT = 'int',
  FLOAT = 'float',
  STRING = 'string',
}

registerEnumType(PreferenceValueType, {
  name: 'PreferenceValueType',
});
