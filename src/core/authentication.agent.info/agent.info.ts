import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { IVerifiedCredential } from '@domain/agent/verified-credential/verified.credential.interface';
export class AgentInfo {
  isAnonymous = false;
  userID = '';
  email = '';
  emailVerified = false;
  firstName = '';
  lastName = '';
  guestName = ''; // Name provided by client for guest users
  credentials: ICredentialDefinition[] = [];
  verifiedCredentials: IVerifiedCredential[] = [];
  communicationID = '';
  agentID = '';
  avatarURL = '';
  expiry?: number = undefined;
}
