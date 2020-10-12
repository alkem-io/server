import { Injectable } from '@nestjs/common';
import { ProfileService } from '../profile/profile.service';
import { User } from './user.entity';
import { IUser } from './user.interface';

@Injectable()
export class UserService {
  constructor(private profileService: ProfileService) {}

  // Helper method to ensure all members that are arrays are initialised properly.
  // Note: has to be a seprate call due to restrictions from ORM.
  async initialiseMembers(user: IUser): Promise<IUser> {
    // Initialise contained singletons
    this.profileService.initialiseMembers(user.profile);

    return user;
  }
  async getUserByID(userID: number): Promise<IUser | undefined> {
    return User.findOne({ id: userID });
  }

  async getUserByEmail(email: string): Promise<IUser | undefined> {
    return User.findOne({ email: email });
  }
}
