import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { IAuthorizationPolicyRuleCredential } from './authorization.policy.rule.credential.interface';

export class AuthorizationPolicyRuleCredential
  implements IAuthorizationPolicyRuleCredential
{
  constructor(
    public grantedPrivileges: AuthorizationPrivilege[],
    public criterias: ICredentialDefinition[],
    public name: string,
    public cascade: boolean = true
  ) {}
}
