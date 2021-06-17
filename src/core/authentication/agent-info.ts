import { ICredential } from '@domain/agent/credential';

export class AgentInfo {
  email = '';
  credentials: ICredential[] = [];
}
