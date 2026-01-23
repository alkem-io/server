import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { IAuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege.interface';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Authorization')
export abstract class IAuthorizationPolicy extends IBaseAlkemio {
  // exposed via field resolver
  credentialRules!: IAuthorizationPolicyRuleCredential[];
  privilegeRules!: IAuthorizationPolicyRulePrivilege[];

  parentAuthorizationPolicy?: IAuthorizationPolicy;

  @Field(() => AuthorizationPolicyType, {
    nullable: true,
    description:
      'A type of entity that this Authorization Policy is being used with.',
  })
  type!: AuthorizationPolicyType;
}
