import { UserPreferenceType } from '@common/enums';
import { SpacePreferenceType } from '@common/enums/space.preference.type';
import { PreferenceValueType } from '@common/enums/preference.value.type';

export class CreatePreferenceDefinitionInput {
  group!: string;
  displayName!: string;
  description!: string;
  valueType!: PreferenceValueType;
  type!: UserPreferenceType | SpacePreferenceType;
}
