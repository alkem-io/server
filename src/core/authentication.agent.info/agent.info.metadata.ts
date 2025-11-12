import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';

export class AgentInfoMetadata {
  userID!: string;
  email!: string;
  credentials: ICredentialDefinition[] = [];
  communicationID!: string;
  agentID!: string;
  did!: string;
  password!: string;
  authenticationID?: string;
}
