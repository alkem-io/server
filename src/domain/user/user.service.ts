import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindConditions, FindOneOptions, Repository } from 'typeorm';
import { LogContexts } from '../../utils/logging/logging.contexts';
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
    private userRepository: Repository<User>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger
  ) {}

  async createUser(userData: UserInput): Promise<IUser> {
    await this.validateUserProfileCreationRequest(userData);

    // Ok to create a new user + save
    const user = User.create(userData);
    await this.initialiseMembers(user);
    this.updateLastModified(user);
    // Need to save to get the object identifiers assigned
    await this.userRepository.save(user);
    this.logger.verbose(
      `Created a new user with id: ${user.id}`,
      LogContexts.COMMUNITY
    );

    // Now update the profile if needed
    const profileData = userData.profileData;
    if (profileData && user.profile) {
      await this.profileService.updateProfile(user.profile.id, profileData);
    }
    // reload the user to get it populated
    const populatedUser = await this.getUserByID(user.id);
    if (!populatedUser) throw new Error(`Unable to locate user: ${user.id}`);

    this.logger.verbose(
      `User ${userData.email} was created!`,
      LogContexts.COMMUNITY
    );

    return populatedUser;
  }

  // Helper method to ensure all members that are arrays are initialised properly.
  // Note: has to be a seprate call due to restrictions from ORM.
  async initialiseMembers(user: IUser): Promise<IUser> {
    if (!user.profile) {
      user.profile = await this.profileService.createProfile();
    }

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
    if (this.isValidEmail(userID)) {
      const user = await this.getUserByEmail(userID);
      if (user) return user;
    }
  }

  async getUserByID(userID: number): Promise<IUser | undefined> {
    return await this.userRepository.findOne({ id: userID });
  }

  async getUserByEmail(
    email: string,
    options?: FindOneOptions<User>
  ): Promise<IUser | undefined> {
    return await this.userRepository.findOne({ email: email }, options);
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
      this.logger.verbose(
        `No user with email ${email} exists!`,
        LogContexts.COMMUNITY
      );
      return undefined;
    }

    if (!user.userGroups) {
      this.logger.verbose(
        `User with email ${email} doesn't belong to any groups!`,
        LogContexts.COMMUNITY
      );
    }

    return user;
  }

  async getUserForAccountWithGroups(
    accountUpn: string
  ): Promise<IUser | undefined> {
    const user = await this.userRepository.findOne(
      { accountUpn: accountUpn },
      { relations: ['userGroups'] }
    );

    if (!user) {
      this.logger.verbose(
        `No user with provided account UPN ${accountUpn} exists!`,
        LogContexts.COMMUNITY
      );
      return undefined;
    }

    if (!user.userGroups) {
      this.logger.verbose(
        `User with provided account UPN ${accountUpn} doesn't belong to any groups!`,
        LogContexts.COMMUNITY
      );
    }

    return user;
  }

  async userExists(email?: string, id?: number): Promise<boolean> {
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
    memberOf.groups = [];
    memberOf.challenges = [];
    memberOf.organisations = [];

    if (!membership) return memberOf;
    if (!membership.userGroups) return memberOf;

    // First get the list of challenges + orgs + groups to return
    for (const group of membership?.userGroups) {
      // Set flag on the group to block population of the members field
      group.membersPopulationEnabled = false;
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

    // Also need to only return the groups that the user is a member of
    for (const challenge of memberOf.challenges) {
      challenge.groups = [];
      // add back in the groups for this challenge
      for (const group of membership?.userGroups) {
        if (group.challenge) {
          // challenge group
          challenge.groups?.push(group);
        }
      }
    }

    // Also need to only return the groups that the user is a member of
    for (const organisation of memberOf.organisations) {
      organisation.groups = [];
      // add back in the groups for this challenge
      for (const group of membership?.userGroups) {
        if (group.challenge) {
          // challenge group
          organisation.groups?.push(group);
        }
      }
    }

    return memberOf;
  }

  async validateUserProfileCreationRequest(
    userData: UserInput
  ): Promise<boolean> {
    if (!this.isValidEmail(userData.email))
      throw new Error(
        `Valid email address required to create a user: ${userData.email}`
      );
    if (!userData.firstName || userData.firstName.length == 0)
      throw new Error(
        `User profile creation (${userData.email}) missing required first name`
      );
    if (!userData.lastName || userData.lastName.length == 0)
      throw new Error(
        `User profile creation (${userData.email}) missing required last name`
      );
    if (!userData.email || userData.email.length == 0)
      throw new Error(
        `User profile creation (${userData.firstName}) missing required email`
      );
    const userCheck = await this.getUserByEmail(userData.email);
    if (userCheck)
      throw new Error(
        `User profile with the specified email (${userData.email}) already exists`
      );
    return true;
  }

  async saveUser(user: IUser): Promise<boolean> {
    await this.userRepository.save(user);
    return true;
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
    if (
      userInput.email &&
      userInput.email.toLowerCase() !== user.email.toLowerCase()
    ) {
      throw new Error(
        `Updating of email addresses is not supported: ${userID}`
      );
    }

    this.updateLastModified(user);
    await this.userRepository.save(user);

    // Check the tagsets
    if (userInput.profileData && user.profile) {
      await this.profileService.updateProfile(
        user.profile.id,
        userInput.profileData
      );
    }

    const populatedUser = await this.getUserByID(user.id);
    if (!populatedUser) throw new Error(`Unable to get user by id: ${user.id}`);

    return populatedUser;
  }

  isValidEmail(email: string): boolean {
    // The reg exp used to validate the email format
    const emailValidationExpression = /\S+@\S+/;
    return emailValidationExpression.test(String(email).toLowerCase());
  }

  updateLastModified(user: IUser) {
    user.lastModified = Math.floor(new Date().getTime() / 1000);
  }
}
