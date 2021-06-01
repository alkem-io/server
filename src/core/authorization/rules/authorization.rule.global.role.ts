import { UserInfo } from '@core/authentication/user-info';
import { IAuthorizationRule } from '@core/authorization/rules';

export class AuthorizationRuleGlobalRole implements IAuthorizationRule {
  type: string;
  priority: number;

  constructor(credentialType: string, priority?: number) {
    this.type = credentialType;
    this.priority = priority ?? 1000;
  }

  execute(userInfo: UserInfo): boolean {
    for (const userCredential of userInfo.credentials) {
      if (userCredential.type === this.type) return true;
    }
    return false;
  }
}
