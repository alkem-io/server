import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindConditions, FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  NotSupportedException,
  ValidationException,
} from '@utils/error-handling/exceptions';
import { LogContext } from '@utils/logging/logging.contexts';
import { ProfileService } from '@domain/profile/profile.service';
import { MemberOf } from './memberof.composite';
import { UserInput } from './user.dto';
import { User } from './user.entity';
import { IUser } from './user.interface';
import validator from 'validator';
@Injectable()
export class UserService {
  constructor(
    private profileService: ProfileService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createUser(userData: UserInput): Promise<IUser> {
    await this.validateUserProfileCreationRequest(userData);

    // Ok to create a new user + save
    const user = User.create(userData);
    await this.initialiseMembers(user);
    this.updateLastModified(user);
    // Need to save to get the object identifiers assigned
    await this.userRepository.save(user);
    this.logger.verbose?.(
      `Created a new user with id: ${user.id}`,
      LogContext.COMMUNITY
    );

    // Now update the profile if needed
    const profileData = userData.profileData;
    if (profileData && user.profile) {
      await this.profileService.updateProfile(user.profile.id, profileData);
    }
    // reload the user to get it populated
    const populatedUser = await this.getUserByID(user.id);
    if (!populatedUser)
      throw new EntityNotFoundException(
        `Unable to locate user: ${user.id}`,
        LogContext.COMMUNITY
      );

    this.logger.verbose?.(
      `User ${userData.email} was created!`,
      LogContext.COMMUNITY
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
    if (validator.isNumeric(userID)) {
      const idInt = parseInt(userID);
      const user = await this.getUserByID(idInt);
      if (user) return user;
    }

    const user = await this.getUserByEmail(userID);
    if (user) return user;
  }

  async getUserByID(userID: number): Promise<IUser> {
    const result = await this.userRepository.findOne({ id: userID });
    if (!result) {
      throw new EntityNotFoundException(
        `Unable to find user with ID: ${userID}`,
        LogContext.COMMUNITY
      );
    }
    return result;
  }

  async getUserByEmail(
    email: string,
    options?: FindOneOptions<User>
  ): Promise<IUser | undefined> {
    const result = await this.userRepository.findOne({ email: email }, options);
    if (!result) {
      throw new EntityNotFoundException(
        `Unable to find user with email: '${email}'`,
        LogContext.COMMUNITY
      );
    }
    return result;
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
      this.logger.verbose?.(
        `No user with email ${email} exists!`,
        LogContext.COMMUNITY
      );
      return undefined;
    }

    if (!user.userGroups) {
      this.logger.verbose?.(
        `User with email ${email} doesn't belong to any groups!`,
        LogContext.COMMUNITY
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
      this.logger.verbose?.(
        `No user with provided account UPN ${accountUpn} exists!`,
        LogContext.COMMUNITY
      );
      return undefined;
    }

    if (!user.userGroups) {
      this.logger.verbose?.(
        `User with provided account UPN ${accountUpn} doesn't belong to any groups!`,
        LogContext.COMMUNITY
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
    } else
      throw new ValidationException(
        'No email or id provided!',
        LogContext.COMMUNITY
      );
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
    if (!userData.firstName || userData.firstName.length == 0)
      throw new ValidationException(
        `User profile creation (${userData.email}) missing required first name`,
        LogContext.COMMUNITY
      );
    if (!userData.lastName || userData.lastName.length == 0)
      throw new ValidationException(
        `User profile creation (${userData.email}) missing required last name`,
        LogContext.COMMUNITY
      );
    if (!userData.email || userData.email.length == 0)
      throw new ValidationException(
        `User profile creation (${userData.firstName}) missing required email`,
        LogContext.COMMUNITY
      );
    const userCheck = await this.getUserByEmail(userData.email);
    if (userCheck)
      throw new ValidationException(
        `User profile with the specified email (${userData.email}) already exists`,
        LogContext.COMMUNITY
      );
    // Trim all values to remove space issues
    userData.firstName = userData.firstName.trim();
    userData.lastName = userData.lastName.trim();
    userData.email = userData.email.trim();
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
    if (!user)
      throw new EntityNotFoundException(
        `Unable to update user with ID: ${userID}`,
        LogContext.COMMUNITY
      );
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
      throw new NotSupportedException(
        `Updating of email addresses is not supported: ${userID}`,
        LogContext.COMMUNITY
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
    if (!populatedUser)
      throw new EntityNotFoundException(
        `Unable to get user by id: ${user.id}`,
        LogContext.COMMUNITY
      );

    return populatedUser;
  }

  updateLastModified(user: IUser) {
    user.lastModified = Math.floor(new Date().getTime() / 1000);
  }
}
