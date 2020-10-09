import { Injectable } from '@nestjs/common';
import { User } from './user.entity';
import { IUser } from './user.interface';

@Injectable()
export class UserService {
  async getUserByID(userID: number): Promise<IUser | undefined> {
    return User.findOne({ id: userID });
  }

  async getUserByEmail(email: string): Promise<IUser | undefined> {
    return User.findOne({ email: email });
  }
}
