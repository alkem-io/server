import { User } from '../models';
import { Service } from 'typedi';

@Service('UserService')
export class UserService {

  public async getUser(id: number): Promise<User | undefined> {
    const user = await User.findOne({ where: { id } });
    return user;
  }
}
