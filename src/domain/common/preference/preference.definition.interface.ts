import { HubPreferenceType } from '@common/enums/hub.preference.type';
import { Field, ObjectType } from '@nestjs/graphql';
import { PreferenceValueType, UserPreferenceType } from '@src/common/enums';
import { IBaseAlkemio } from '@src/domain/common';

@ObjectType('PreferenceDefinition')
export abstract class IPreferenceDefinition extends IBaseAlkemio {
  @Field(() => String, {
    description:
      'The group for the preference within the containing entity type.',
  })
  group!: string;

  @Field(() => String, {
    description: 'The name',
  })
  displayName!: string;

  @Field(() => String, {
    description: 'Preference description',
  })
  description!: string;

  @Field(() => UserPreferenceType, {
    description: 'The type of the Preference, specific to the Entity it is on.',
  })
  type!: UserPreferenceType | HubPreferenceType;

  @Field(() => PreferenceValueType, {
    description: 'Preference value type',
  })
  valueType!: PreferenceValueType;

  definitionSet!: string;
}
