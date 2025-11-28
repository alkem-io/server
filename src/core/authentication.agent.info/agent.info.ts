import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
export class AgentInfo {
  isAnonymous = false;
  userID = '';
  email = '';
  emailVerified = false;
  firstName = '';
  lastName = '';
  credentials: ICredentialDefinition[] = [];
  communicationID = '';
  agentID = '';
  avatarURL = '';
  expiry?: number = undefined;
}
