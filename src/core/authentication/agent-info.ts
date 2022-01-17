import { ICredential } from '@domain/agent/credential';
import { VerifiedCredential } from '@domain/agent/verified-credential';

export class AgentInfo {
  userID = '';
  email = '';
  firstName = '';
  lastName = '';
  credentials: ICredential[] = [];
  verifiedCredentials: VerifiedCredential[] = [];
  communicationID = '';
}
