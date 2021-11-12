import { UserPreferenceType, UserPreferenceValueType } from '@src/common';

export class CreateUserPreferenceDefinitionInput {
  group!: string;
  displayName!: string;
  description!: string;
  valueType!: UserPreferenceValueType;
  type!: UserPreferenceType;
}
