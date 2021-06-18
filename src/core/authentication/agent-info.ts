import { ICredential } from '@domain/agent/credential';
import { VerifiedCredential } from '@src/services/platform/ssi/agent';

export class AgentInfo {
  email = '';
  credentials: ICredential[] = [];
  verifiedCredentials: VerifiedCredential[] = [];
}
