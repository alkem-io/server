import { AgentInfo } from '@core/authentication/agent-info';

export interface IAuthorizationRule {
  execute(user: AgentInfo): boolean;
  priority: number;
}
