import { Field, ObjectType } from '@nestjs/graphql';
import { UserPreferenceType, UserPreferenceValueType } from '@src/common/enums';
import { IBaseAlkemio } from '@src/domain/common';

@ObjectType('UserPreferenceDefinition')
export abstract class IUserPreferenceDefinition extends IBaseAlkemio {
  @Field(() => String, {
    description: 'The group',
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
    description: 'Type of preference',
  })
  type!: UserPreferenceType;

  @Field(() => UserPreferenceValueType, {
    description: 'Preference value type',
  })
  valueType!: UserPreferenceValueType;
}
