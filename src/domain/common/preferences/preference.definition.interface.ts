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

  // todo: this should be an enum of User / Hub / Org preferences etc.
  @Field(() => UserPreferenceType, {
    description: 'Type of preference',
  })
  type!: string;

  @Field(() => PreferenceValueType, {
    description: 'Preference value type',
  })
  valueType!: PreferenceValueType;
}
