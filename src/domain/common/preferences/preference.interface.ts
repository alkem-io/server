import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IPreferenceDefinition } from './preference.definition.interface';

@ObjectType('Preference')
export abstract class IPreference extends IAuthorizable {
  @Field(() => IPreferenceDefinition, {
    description: 'The definition for the Preference',
    name: 'definition',
  })
  preferenceDefinition!: IPreferenceDefinition;

  @Field(() => String, {
    description: 'Value of the preference',
  })
  value!: string;
}
