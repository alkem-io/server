import { IUser } from '@domain/user/user.interface';

export class AccountMapping {
  email!: string;
  user?: IUser;

  constructor(email: string, user: IUser | undefined) {
    this.email = email;
    this.user = user;
  }

  newUser(): boolean {
    if (!this.user) return true;
    return false;
  }
}
