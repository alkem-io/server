import { ICredential } from '@domain/agent/credential';
import { VerifiedCredential } from '@src/services/platform/ssi/agent';

export class AgentInfo {
  userID = '';
  email = '';
  firstName = '';
  lastName = '';
  credentials: ICredential[] = [];
  verifiedCredentials: VerifiedCredential[] = [];
}
