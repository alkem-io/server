import { ICredential } from '@domain/agent';

export class AgentInfo {
  email = '';
  credentials: ICredential[] = [];
}
