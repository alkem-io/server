import { IAgent } from '@domain/agent/agent';

export interface ICredential {
  id: number;
  agent?: IAgent;
  resourceID: number;
  type: string;
}
