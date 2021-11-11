import { ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';

@ObjectType('UserPreferenceDefinition')
export abstract class IUserPreferenceDefinition extends IAuthorizable {
  /*@Field(() => String, {
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
  valueType!: UserPreferenceValueType*/
}
