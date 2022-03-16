import { ICredential } from '@domain/agent/credential';
import { IVerifiedCredential } from '@domain/agent/verified-credential/verified.credential.interface';

export class AgentInfo {
  userID = '';
  email = '';
  firstName = '';
  lastName = '';
  credentials: ICredential[] = [];
  verifiedCredentials: IVerifiedCredential[] = [];
  communicationID = '';
  agentID = '';
}
