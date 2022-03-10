import { UserPreferenceType } from '@common/enums';
import { HubPreferenceType } from '@common/enums/hub.preference.type';
import { PreferenceValueType } from '@common/enums/preference.value.type';

export class CreatePreferenceDefinitionInput {
  group!: string;
  displayName!: string;
  description!: string;
  valueType!: PreferenceValueType;
  type!: UserPreferenceType | HubPreferenceType;
}
