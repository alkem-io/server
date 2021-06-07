import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Authorization')
export abstract class IAuthorizationDefinition {
  // declare here so that the field does not get shown on api
  id!: string;

  @Field(() => Boolean)
  anonymousReadAccess!: boolean;

  @Field(() => String)
  credentialRules!: string;
}
