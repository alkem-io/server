import { IncomingHttpHeaders } from 'http';
import { ActorContext } from '@core/actor-context';

export interface SubscriptionResolveContext {
  req: {
    headers: IncomingHttpHeaders;
    user: ActorContext;
  };
}
