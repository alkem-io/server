import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IncomingHttpHeaders } from 'http';

export interface SubscriptionResolveContext {
  req: {
    headers: IncomingHttpHeaders;
    user: AgentInfo;
  };
}
