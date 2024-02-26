import { ICredential } from '@domain/agent/credential';

export class AgentInfoMetadata {
  userID!: string;
  email!: string;
  credentials: ICredential[] = [];
  communicationID!: string;
  agentID!: string;
  did!: string;
  password!: string;
}
