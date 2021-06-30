import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizationDefinition } from '@domain/common/authorization-definition';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';

@ObjectType('IAuthorizable')
export abstract class IAuthorizable extends IBaseAlkemio {
  @Field(() => IAuthorizationDefinition, {
    nullable: true,
    description: 'The authorization rules for the entity',
  })
  authorization?: IAuthorizationDefinition;
}
