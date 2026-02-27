import { ActorContext } from '@core/actor-context/actor.context';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AnyStateMachine } from 'xstate';
import { ILifecycle } from '../lifecycle.interface';

export class LifecycleEventInput {
  machine!: AnyStateMachine;
  lifecycle!: ILifecycle;
  eventName!: string;
  actorContext!: ActorContext;
  authorization?: IAuthorizationPolicy;
}
