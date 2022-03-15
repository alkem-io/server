import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { IAuthorizationPolicyRuleVerifiedCredentialClaim } from './authorization.policy.rule.verified.credential.claim.interface';

export class AuthorizationPolicyRuleVerifiedCredentialClaim
  implements IAuthorizationPolicyRuleVerifiedCredentialClaim
{
  name: string;
  value: string;
  grantedPrivileges: AuthorizationPrivilege[];

  constructor(
    grantedPrivileges: AuthorizationPrivilege[],
    name: string,
    value: string
  ) {
    this.name = name || '';
    this.value = value || '';
    this.grantedPrivileges = grantedPrivileges;
  }
}
