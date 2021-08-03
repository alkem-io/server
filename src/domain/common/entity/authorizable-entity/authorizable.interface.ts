import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';

@ObjectType('IAuthorizable')
export abstract class IAuthorizable extends IBaseAlkemio {
  @Field(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'The authorization rules for the entity',
  })
  authorization?: IAuthorizationPolicy;
}
