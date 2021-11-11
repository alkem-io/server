import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IUserPreferenceDefinition } from './preference.definition.interface';
import { IUser } from '../user.interface';

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

  // @Field(() => IUser, {
  //   nullable: false,
  //   description: 'The user which preference is this'
  // })
  user!: IUser;
}
