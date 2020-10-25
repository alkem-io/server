import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindConditions, FindOneOptions, Repository } from 'typeorm';
import { Profile } from '../profile/profile.entity';
import { ProfileService } from '../profile/profile.service';
import { IUserGroup } from '../user-group/user-group.interface';
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

  //Find a user either by id or email
  //toDo - review that
  async getUser(userID: string): Promise<IUser | undefined> {
    const idInt: number = parseInt(userID);
    if (!isNaN(idInt)) {
      const user = await this.getUserByID(idInt);
      if (user) return user;
    }
    // If get here then id was not a number, or not found
    // Check the email address format: simple format check
    const expression = /\S+@\S+/;
    const emailChecked = expression.test(String(userID).toLowerCase());
    if (emailChecked) {
      const user = await this.getUserByEmail(userID);
      if (user) return user;
    }
  }

  async getUserByID(userID: number): Promise<IUser | undefined> {
    return this.userRepository.findOne({ id: userID });
  }

  async getUserByEmail(
    email: string,
    options?: FindOneOptions<User>
  ): Promise<IUser | undefined> {
    return this.userRepository.findOne({ email: email }, options);
  }

  async findUser(
    conditions?: FindConditions<User>,
    options?: FindOneOptions<User>
  ): Promise<IUser | undefined> {
    return await this.userRepository.findOne(conditions, options);
  }

  async getUserWithGroups(email: string): Promise<IUser | undefined> {
    const user = await this.userRepository.findOne(
      { email: email },
      { relations: ['userGroups'] }
    );

    if (!user) {
      console.log(`No user with email ${email} exists!`);
      return undefined;
    }

    if (!user.userGroups) {
      console.log(`User with email ${email} doesn't belong to any groups!`);
    }

    return user;
  }

  async userExists(
    email: string | undefined,
    id: number | undefined
  ): Promise<boolean> {
    if (email) {
      if (await this.getUserByEmail(email)) return true;
      else return false;
    } else if (id) {
      if (await this.getUserByID(id)) return true;
      else return false;
    } else throw new Error('No email or id provided!');
  }

  async getMemberOf(user: User): Promise<MemberOf> {
    const membership = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userGroups', 'userGroup')
      .leftJoinAndSelect('userGroup.ecoverse', 'ecoverse')
      .leftJoinAndSelect('userGroup.challenge', 'challenge')
      .leftJoinAndSelect('userGroup.organisation', 'organisation')
      .where('user.id = :userId')
      .setParameters({ userId: `${user.id}` })
      .getOne();

    const memberOf = new MemberOf();
    memberOf.email = user.email;
    memberOf.groups = [];
    memberOf.challenges = [];
    memberOf.organisations = [];

    if (!membership) return memberOf;

    if (membership?.userGroups) {
      for await (const group of membership?.userGroups) {
        const ecoverse = group.ecoverse;
        const challenge = group.challenge;
        const organisation = group.organisation;

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
      return memberOf;
    }

    return memberOf;
  }

  async createUser(userData: UserInput): Promise<IUser> {
    // Check if a user with this email already exists
    const newUserEmail = userData.email;
    const existingUser = await this.getUserByEmail(newUserEmail);

    if (existingUser)
      throw new Error(
        `A user with the provided email address: ${newUserEmail} already exists!`
      );

    // Ok to create a new user + save
    const user = User.create(userData);
    // Have the user,ensure it is initialised
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
}
