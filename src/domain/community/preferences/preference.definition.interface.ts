import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { UserPreferenceValueType } from '@src/common';
import { IUserPreference } from './preference.interface';

@ObjectType('UserPreferenceDefinition')
export abstract class IUserPreferenceDefinition extends IAuthorizable {
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

  @Field(() => UserPreferenceValueType, {
    description: 'Preference value type',
  })
  valueType!: UserPreferenceValueType;

  @Field(() => IUserPreference)
  userPreference?: IUserPreference;
}
