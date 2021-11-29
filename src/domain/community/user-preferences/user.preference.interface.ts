import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IUserPreferenceDefinition } from './user.preference.definition.interface';

@ObjectType('UserPreference')
export abstract class IUserPreference extends IAuthorizable {
  @Field(() => IUserPreferenceDefinition, {
    description: 'The definition for the Preference',
  })
  definition!: IUserPreferenceDefinition;

  @Field(() => String, {
    description: 'Value of the preference',
  })
  value!: string;
}
