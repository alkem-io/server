import { ActorContext } from '@core/actor-context';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { ILifecycle } from '../lifecycle.interface';
import { AnyStateMachine } from 'xstate';

export class LifecycleEventInput {
  machine!: AnyStateMachine;
  lifecycle!: ILifecycle;
  eventName!: string;
  actorContext!: ActorContext;
  authorization?: IAuthorizationPolicy;
}
