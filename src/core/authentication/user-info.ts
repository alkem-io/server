import { ICredential } from '@domain/agent';
import { IUser } from '@domain/community/user/user.interface';

export class UserInfo {
  email!: string;
  user?: IUser;
  credentials: ICredential[] = [];
}
