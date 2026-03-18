import { ActorContext } from '@core/actor-context/actor.context';
import { IncomingHttpHeaders } from 'http';

export interface SubscriptionResolveContext {
  req: {
    headers: IncomingHttpHeaders;
    user: ActorContext;
  };
}
