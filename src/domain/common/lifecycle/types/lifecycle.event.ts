import { ActorContext } from '@core/actor-context';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';

export type LifecycleEvent = {
  parentID: string;
  actorContext: ActorContext;
  authorization: AuthorizationPolicy;
};
