import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
export class AgentInfo {
  isAnonymous = false;
  userID = '';
  email = '';
  emailVerified = false;
  firstName = '';
  lastName = '';
  guestName = ''; // Name provided by client for guest users
  credentials: ICredentialDefinition[] = [];
  agentID = '';
  avatarURL = '';
  authenticationID = '';
  expiry?: number = undefined;
}
