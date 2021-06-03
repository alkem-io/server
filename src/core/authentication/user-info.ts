import { ICredential } from '@domain/agent';

export class UserInfo {
  email = '';
  credentials: ICredential[] = [];
}
