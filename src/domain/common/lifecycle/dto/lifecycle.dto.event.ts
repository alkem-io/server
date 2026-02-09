import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AnyStateMachine } from 'xstate';
import { ILifecycle } from '../lifecycle.interface';

export class LifecycleEventInput {
  machine!: AnyStateMachine;
  lifecycle!: ILifecycle;
  eventName!: string;
  agentInfo!: AgentInfo;
  authorization?: IAuthorizationPolicy;
}
