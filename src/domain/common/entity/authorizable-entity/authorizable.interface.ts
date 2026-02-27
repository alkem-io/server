import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('IAuthorizable')
export abstract class IAuthorizable extends IBaseAlkemio {
  @Field(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'The authorization rules for the entity',
  })
  authorization?: IAuthorizationPolicy;
}
