import { UserNotRegisteredException } from '@common/exceptions/registration.exception';
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
    if (!userInfo.user || !userInfo.user.profile) {
      throw new UserNotRegisteredException(
        `Error: Unable to find user with given email: ${userInfo.email}`
      );
    }
    const userCredentials = userInfo.user.agent?.credentials;
    if (!userCredentials) return false;
    for (const userCredential of userCredentials) {
      if (userCredential.type === this.type) return true;
    }
    return false;
  }
}
