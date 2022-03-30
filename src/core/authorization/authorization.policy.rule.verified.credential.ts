import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { IAuthorizationPolicyRuleVerifiedCredential } from './authorization.policy.rule.verified.credential.interface';

export class AuthorizationPolicyRuleVerifiedCredential
  implements IAuthorizationPolicyRuleVerifiedCredential
{
  credentialName: string;
  claimRule: string;
  grantedPrivileges: AuthorizationPrivilege[];

  constructor(
    grantedPrivileges: AuthorizationPrivilege[],
    name: string,
    claimRule?: { name: string; value: string }
  ) {
    let claimRuleStr = '';
    if (claimRule) claimRuleStr = JSON.stringify(claimRule);
    this.credentialName = name;
    this.claimRule = claimRuleStr;
    this.grantedPrivileges = grantedPrivileges;
  }
}
