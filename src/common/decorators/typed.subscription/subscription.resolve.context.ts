import { IncomingHttpHeaders } from 'http';
import { AgentInfo } from '@core/authentication';

export interface SubscriptionResolveContext {
  req: {
    authInfo: unknown;
    headers: IncomingHttpHeaders;
    user: AgentInfo;
  };
}
