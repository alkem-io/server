import { IBaseCherrytwist } from '@domain/common/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Authorization')
export abstract class IAuthorizationDefinition extends IBaseCherrytwist {
  @Field(() => Boolean)
  anonymousReadAccess!: boolean;

  @Field(() => String)
  credentialRules!: string;

  @Field(() => String)
  verifiedCredentialRules!: string;
}
