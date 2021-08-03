import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Authorization')
export abstract class IAuthorizationPolicy extends IBaseAlkemio {
  @Field(() => Boolean)
  anonymousReadAccess!: boolean;

  // exposed via field resolver
  credentialRules!: string;
  verifiedCredentialRules!: string;
}
