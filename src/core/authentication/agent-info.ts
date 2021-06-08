import { IAgent, ICredential } from '@domain/agent';

export class AgentInfo {
  email = '';
  credentials: ICredential[] = [];
  agent?: IAgent;
}
