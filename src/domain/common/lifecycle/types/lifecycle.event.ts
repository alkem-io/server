import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';

export type LifecycleEvent = {
  parentID: string;
  agentInfo: AgentInfo;
  authorization: AuthorizationPolicy;
};
