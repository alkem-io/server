import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';

export class AgentInfoMetadata {
  userID!: string;
  credentials: ICredentialDefinition[] = [];
  agentID!: string;
  did!: string;
  password!: string;
  authenticationID?: string;
}
