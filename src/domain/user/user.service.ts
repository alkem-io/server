import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from '../profile/profile.entity';
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
    if (!user.profile) {
      user.profile = new Profile();
    }
    // Initialise contained singletons
    await this.profileService.initialiseMembers(user.profile);

    return user;
  }

  // Find a user either by id or email
  async getUser(userID: string): Promise<IUser | undefined> {
    const idInt: number = parseInt(userID);
    if (!isNaN(idInt)) {
      const user = await this.getUserByID(idInt);
      if (user) return user;
    }
    if (this.isValidEmail(userID)) {
      const user = await this.getUserByEmail(userID);
      if (user) return user;
    }
  }

  async getUserByID(userID: number): Promise<IUser | undefined> {
    return this.userRepository.findOne({ id: userID });
  }

  async getUserByEmail(email: string): Promise<IUser | undefined> {
    return this.userRepository.findOne({ email: email });
  }

  async userExists(email: string): Promise<boolean> {
    if (await this.getUserByEmail(email)) return true;
    else return false;
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
    // Check if a valid email address was given
    const newUserEmail = userData.email;
    // Validate that the user has some key fields et
    if (!this.isValidEmail(newUserEmail))
      throw new Error(
        `Valid email address required to create a user: ${newUserEmail}`
      );

    // Check if a user with the given email already exists
    const existingUser = await this.getUserByEmail(newUserEmail);
    if (existingUser)
      throw new Error(
        `A user with the provided email address: ${newUserEmail} already exists!`
      );

    // Ok to create a new user + save
    const user = User.create(userData);
    await this.initialiseMembers(user);
    await this.userRepository.save(user);

    console.info(`User ${userData.email} was created!`);

    return user;
  }

  async removeUser(user: IUser): Promise<IUser> {
    const result = await this.userRepository.remove(user as User);
    return result;
  }

  // Note: explicitly do not support updating of email addresses
  async updateUser(userID: number, userInput: UserInput): Promise<IUser> {
    const user = await this.getUserByID(userID);
    if (!user) throw new Error(`Unable to update user with ID: ${userID}`);
    // Convert the data to json
    if (userInput.name) {
      user.name = userInput.name;
    }
    if (userInput.firstName) {
      user.firstName = userInput.firstName;
    }
    if (userInput.lastName) {
      user.lastName = userInput.lastName;
    }
    if (userInput.phone) {
      user.phone = userInput.phone;
    }
    if (userInput.city) {
      user.city = userInput.city;
    }
    if (userInput.country) {
      user.country = userInput.country;
    }
    if (userInput.gender) {
      user.gender = userInput.gender;
    }
    if (userInput.email) {
      throw new Error(
        `Updating of email addresses is not supported: ${userID}`
      );
    }

    await this.userRepository.save(user);
    return user;
  }

  isValidEmail(email: string): boolean {
    // The reg exp used to validate the email format
    const emailValidationExpression = /\S+@\S+/;
    return emailValidationExpression.test(String(email).toLowerCase());
  }
}
