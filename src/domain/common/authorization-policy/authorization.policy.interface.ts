import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Authorization')
export abstract class IAuthorizationPolicy extends IBaseAlkemio {
  @Field(() => Boolean)
  anonymousReadAccess!: boolean;

  // exposed via field resolver
  credentialRules!: string;
  verifiedCredentialRules!: string;
  privilegeRules!: string;

  @Field(() => AuthorizationPolicyType, {
    nullable: false,
    description:
      'A type of entity that this Authorization Policy is being used with.',
  })
  type!: AuthorizationPolicyType;
}
