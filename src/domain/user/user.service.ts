import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileService } from '../profile/profile.service';
import { MemberOf } from './memberof.composite';
import { UserInput } from './user.dto';
import { User } from './user.entity';
import { IUser } from './user.interface';

@Injectable()
export class UserService {
  constructor(
    private profileService: ProfileService,
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  // Helper method to ensure all members that are arrays are initialised properly.
  // Note: has to be a seprate call due to restrictions from ORM.
  async initialiseMembers(user: IUser): Promise<IUser> {
    // Initialise contained singletons
    this.profileService.initialiseMembers(user.profile);

    return user;
  }
  async getUserByID(userID: number): Promise<IUser | undefined> {
    return this.userRepository.findOne({ id: userID });
  }

  async getUserByEmail(email: string): Promise<IUser | undefined> {
    return this.userRepository.findOne({ email: email });
  }

  async getMemberOf(user: User): Promise<MemberOf> {
    const userGroups = await user.userGroups;
    const memberOf = new MemberOf();
    memberOf.email = user.email;
    memberOf.groups = [];
    memberOf.challenges = [];
    memberOf.organisations = [];

    if (userGroups) {
      // Find all top level groups
      let i;
      const count = userGroups.length;
      for (i = 0; i < count; i++) {
        const group = userGroups[i];
        const ecoverse = await group.ecoverse;
        const challenge = await group.challenge;
        const organisation = await group.organisation;

        // check if the group is an ecoverse group
        if (ecoverse) {
          // ecoverse group
          memberOf.groups.push(group);
        }
        if (challenge) {
          // challenge group
          memberOf.challenges.push(challenge);
        }
        if (organisation) {
          // challenge group
          memberOf.organisations.push(organisation);
        }
      }
    }
    return memberOf;
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

    return user;
  }
}
