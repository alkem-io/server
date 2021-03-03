import { IUser } from '@domain/user/user.interface';

export class AuthenticatedUserDTO {
  email!: string;
  ctUser?: IUser;
  newUser: boolean;

  constructor(email: string, ctUser: IUser | undefined) {
    this.email = email;
    this.ctUser = ctUser;
    this.newUser = false;
    if (!ctUser) {
      this.newUser = true;
    }
  }
}
