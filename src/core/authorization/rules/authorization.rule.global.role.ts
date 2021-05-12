import { IAuthorizationRule } from '@core/authorization/rules';
import { IUser } from '@domain/community';

export class AuthorizationRuleGlobalRole implements IAuthorizationRule {
  type: string;
  priority: number;

  constructor(credentialType: string, priority?: number) {
    this.type = credentialType;
    this.priority = priority ?? 1000;
  }

  execute(user: IUser): boolean {
    const userCredentials = user.agent?.credentials;
    if (!userCredentials) return false;
    for (const userCredential of userCredentials) {
      if (userCredential.type === this.type) return true;
    }
    return false;
  }
}
