import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { ILifecycle } from '../lifecycle.interface';

export class LifecycleEventInput {
  machine!: any;
  lifecycle!: ILifecycle;
  eventName!: string;

  agentInfo!: AgentInfo;
  authorization?: IAuthorizationPolicy;
  parentID!: string;
}
