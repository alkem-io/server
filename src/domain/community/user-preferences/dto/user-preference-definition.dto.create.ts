import { UserPreferenceType } from '@src/common/enums/user.preference.type';
import { UserPreferenceValueType } from '@src/common/enums/user.preference.value.type';

export class CreateUserPreferenceDefinitionInput {
  group!: string;
  displayName!: string;
  description!: string;
  valueType!: UserPreferenceValueType;
  type!: UserPreferenceType;
}
