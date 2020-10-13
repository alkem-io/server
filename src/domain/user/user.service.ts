import { Injectable } from '@nestjs/common';
import { ProfileService } from '../profile/profile.service';
import { UserInput } from './user.dto';
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

  async createUser(userData: UserInput): Promise<IUser> {
    // Check if a user with this email already exists
    const newUserEmail = userData.email;
    const existingUser = await this.getUserByEmail(newUserEmail);

    if (existingUser)
      throw new Error(
        `Already have a user with the provided email address: ${newUserEmail}`
      );

    // Ok to create a new user + save
    const user = User.create(userData);
    await user.save();

    return user;
  }
}
