import { Field, ObjectType } from '@nestjs/graphql';
import { PreferenceValueType } from '@src/common/enums';
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

  // Moved to field resolver to allow for explicitly having the type returned
  type!: string;

  @Field(() => PreferenceValueType, {
    description: 'Preference value type',
  })
  valueType!: PreferenceValueType;
}
