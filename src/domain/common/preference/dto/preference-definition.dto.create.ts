import { PreferenceValueType } from '@common/enums/preference.value.type';

export class CreatePreferenceDefinitionInput {
  group!: string;
  displayName!: string;
  description!: string;
  valueType!: PreferenceValueType;
  type!: string;
}
