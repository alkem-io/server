import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IUserPreferenceDefinition } from './preference.definition.interface';

@ObjectType('UserPreference')
export abstract class IUserPreference extends IAuthorizable {
  @Field(() => IUserPreferenceDefinition, {
    description: 'The preference definition',
  })
  userPreferenceDefinition!: IUserPreferenceDefinition;

  @Field(() => String, {
    description: 'Value of the preference',
  })
  value!: string;
}
