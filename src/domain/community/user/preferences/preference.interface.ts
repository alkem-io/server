import { ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';

@ObjectType('UserPreference')
export abstract class IUserPreference extends IAuthorizable {
  /*@Field(() => IUserPreferenceDefinition)
  userPreferenceDefinition!: IUserPreferenceDefinition;

  @Field(() => String, {
    description: 'Value of the preference',
  })
  value!: string;*/
}
