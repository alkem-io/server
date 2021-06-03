import { AgentInfo } from '@core/authentication/agent-info';
import { IAuthorizationRule } from '@core/authorization/rules';

export class AuthorizationRuleGlobalRole implements IAuthorizationRule {
  type: string;
  priority: number;

  constructor(credentialType: string, priority?: number) {
    this.type = credentialType;
    this.priority = priority ?? 1000;
  }

  execute(agentInfo: AgentInfo): boolean {
    for (const userCredential of agentInfo.credentials) {
      if (userCredential.type === this.type) return true;
    }
    return false;
  }
}
