import { AuthenticationType } from '@common/enums/authentication.type';
import { ICredential } from '@domain/agent/credential';
import { IVerifiedCredential } from '@domain/agent/verified-credential/verified.credential.interface';
export class AgentInfo {
  userID = '';
  email = '';
  emailVerified = false;
  firstName = '';
  lastName = '';
  credentials: ICredential[] = [];
  verifiedCredentials: IVerifiedCredential[] = [];
  communicationID = '';
  agentID = '';
  avatarURL = '';
  expiry?: number = undefined;
  authenticationType?: AuthenticationType;
}
