import { AgentInfo } from '@core/authentication/agent-info';
import { IAuthorizationRule } from './authorization.rule.interface';

export class AuthorizationRuleEngine {
  authorizationRules: IAuthorizationRule[];

  constructor(authorizationRules: IAuthorizationRule[]) {
    this.authorizationRules = authorizationRules;
  }

  run(agentInfo: AgentInfo): boolean {
    const orderedRules = this.authorizationRules.sort((a, b) =>
      a.priority < b.priority ? -1 : a.priority > b.priority ? 1 : 0
    );

    for (const rule of orderedRules) {
      if (rule.execute(agentInfo)) return true;
    }
    return false;
  }
}
