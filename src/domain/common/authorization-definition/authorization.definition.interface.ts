import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Authorization')
export abstract class IAuthorizationDefinition extends IBaseAlkemio {
  @Field(() => Boolean)
  anonymousReadAccess!: boolean;

  @Field(() => String)
  credentialRules!: string;

  @Field(() => String)
  verifiedCredentialRules!: string;
}
