import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizationDefinition } from '../authorization-definition';
import { IBaseCherrytwist } from '../base-entity';

@ObjectType('IAuthorizable')
export abstract class IAuthorizable extends IBaseCherrytwist {
  @Field(() => IAuthorizationDefinition, {
    nullable: false,
    description: 'The authorization rules for the entity',
  })
  authorization?: IAuthorizationDefinition;
}
