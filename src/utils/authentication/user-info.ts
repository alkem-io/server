import { IUser } from '@domain/user/user.interface';

export class UserInfo {
  email!: string;
  user?: IUser;
}
