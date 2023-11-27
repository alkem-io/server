import { IncomingHttpHeaders } from 'http';
import { AgentInfo } from '@core/authentication';

export interface SubscriptionResolveContext {
  req: {
    headers: IncomingHttpHeaders;
    user: AgentInfo;
  };
}
