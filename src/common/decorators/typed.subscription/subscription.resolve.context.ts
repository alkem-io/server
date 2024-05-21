import { IncomingHttpHeaders } from 'http';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';

export interface SubscriptionResolveContext {
  req: {
    headers: IncomingHttpHeaders;
    user: AgentInfo;
  };
}
