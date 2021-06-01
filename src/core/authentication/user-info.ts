import { ICredential } from '@domain/agent';

export class UserInfo {
  email!: string;
  credentials: ICredential[] = [];
}
