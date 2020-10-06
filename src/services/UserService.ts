import { User } from '../models';
import { Service } from 'typedi';

@Service('UserService')
export class UserService {

  public async getUser(userID: number): Promise<User | undefined> {
    const user = await User.findOne({ where: [ { id: userID } ] });
    return user;
  }

  public async getUserByEmail(email: string): Promise<User | undefined> {
    const user = await User.findOne({ where: { email } });
    return user;
  }


}
