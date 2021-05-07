import { IAuthorizationRule } from '@core/authorization/rules';
import { IUser } from '@domain/community';

export class AuthorizationRuleGlobalRole implements IAuthorizationRule {
  type: string;

  constructor(credentialType: string) {
    this.type = credentialType;
  }

  evaluate(user: IUser): boolean {
    const userCredentials = user.credentials;
    if (!userCredentials) return false;
    for (const userCredential of userCredentials) {
      if (userCredential.type === this.type) return true;
    }
    return false;
  }
}
