import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { IAuthorizationPolicy } from './authorization.policy.interface';

export class AuthorizationPolicy
  extends BaseAlkemioEntity
  implements IAuthorizationPolicy
{
  credentialRules: AuthorizationPolicyRuleCredential[];

  privilegeRules: AuthorizationPolicyRulePrivilege[];

  type!: AuthorizationPolicyType;

  // An authorization can optionally choose to store a reference to the parent authorization from which it inherits
  // This is useful for when the entity wants to adjust its settings + may no longer have access without hacky code
  // to the authorization of the containing entity
  parentAuthorizationPolicy?: AuthorizationPolicy;

  constructor(type: AuthorizationPolicyType) {
    super();
    this.credentialRules = [];
    this.privilegeRules = [];
    this.type = type;
  }
}
