import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizationDefinition } from '@domain/common/authorization-definition';
import { IBaseCherrytwist } from '@domain/common/entity/base-entity';

@ObjectType('IAuthorizable')
export abstract class IAuthorizable extends IBaseCherrytwist {
  @Field(() => IAuthorizationDefinition, {
    nullable: true,
    description: 'The authorization rules for the entity',
  })
  authorization?: IAuthorizationDefinition;
}
