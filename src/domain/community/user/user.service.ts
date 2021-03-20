import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  NotSupportedException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { ProfileService } from '@domain/community/profile/profile.service';
import { MemberOf } from './memberof.composite';
import { UserInput } from './user.dto';
import { User } from './user.entity';
import { IUser } from './user.interface';
import validator from 'validator';
import { IGroupable } from '@src/common/interfaces/groupable.interface';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { ICommunityable } from '@interfaces/communityable.interface';
import { ICommunity } from '../community/community.interface';
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
    const populatedUser = await this.getUserByIdOrFail(user.id);

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

  async removeUser(userID: number): Promise<IUser> {
    const user = await this.getUserByIdOrFail(userID);
    const { id } = user;

    if (user.profile) {
      await this.profileService.removeProfile(user.profile.id);
    }

    const result = await this.userRepository.remove(user as User);
    return {
      ...result,
      id,
    };
  }

  async validateUserProfileCreationRequest(
    userData: UserInput
  ): Promise<boolean> {
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
    userData.email = userData.email.trim();
    return true;
  }

  async saveUser(user: IUser): Promise<boolean> {
    await this.userRepository.save(user);
    return true;
  }

  //Find a user either by id or email
  async getUserOrFail(userID: string): Promise<IUser> {
    if (validator.isNumeric(userID)) {
      const idInt: number = parseInt(userID);
      return await this.getUserByIdOrFail(idInt);
    }

    return await this.getUserByEmailOrFail(userID);
  }

  async getUserByIdOrFail(
    userID: number,
    options?: FindOneOptions<User>
  ): Promise<IUser> {
    const user = await this.userRepository.findOne({ id: userID }, options);
    if (!user)
      throw new EntityNotFoundException(
        `Unable to find user with given ID: ${userID}`,
        LogContext.COMMUNITY
      );
    return user;
  }

  async getUserByEmail(
    email: string,
    options?: FindOneOptions<User>
  ): Promise<IUser | undefined> {
    return await this.userRepository.findOne({ email: email }, options);
  }

  async getUserByEmailOrFail(
    email: string,
    options?: FindOneOptions<User>
  ): Promise<IUser> {
    const user = await this.getUserByEmail(email, options);
    if (!user)
      throw new EntityNotFoundException(
        `Unable to find user with given email: ${email}`,
        LogContext.COMMUNITY
      );
    return user;
  }

  async getUserWithGroups(email: string): Promise<IUser | undefined> {
    const user = await this.getUserByEmail(email, {
      relations: ['userGroups'],
    });

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

  async getUsers(): Promise<IUser[]> {
    return (await this.userRepository.find()) || [];
  }

  // Note: explicitly do not support updating of email addresses
  async updateUser(userID: number, userInput: UserInput): Promise<IUser> {
    const user = await this.getUserByIdOrFail(userID);

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

    const populatedUser = await this.getUserByIdOrFail(user.id);

    return populatedUser;
  }

  updateLastModified(user: IUser) {
    user.lastModified = Math.floor(new Date().getTime() / 1000);
  }

  getCommunity(entity: ICommunityable): ICommunity {
    const community = entity.community;
    if (!community)
      throw new EntityNotInitializedException(
        `Community not initialised on entity: ${entity.id}`,
        LogContext.COMMUNITY
      );
    return community;
  }

  // Membership related functionality

  addGroupToEntity(
    entities: IGroupable[],
    entity: IGroupable,
    group: IUserGroup
  ) {
    const existingEntity = entities.find(e => e.id === entity.id);
    if (!existingEntity) {
      //first time through
      entities.push(entity);
      entity.groups = [group];
    } else {
      existingEntity.groups?.push(group);
    }
  }

  async getMemberOf(user: User): Promise<MemberOf> {
    const membership = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userGroups', 'userGroup')
      .leftJoinAndSelect('userGroup.community', 'community')
      .leftJoinAndSelect('userGroup.organisation', 'organisation')
      .where('user.id = :userId')
      .setParameters({ userId: `${user.id}` })
      .getOne();

    const memberOf = new MemberOf();
    memberOf.communities = [];
    memberOf.organisations = [];

    if (!membership) return memberOf;
    if (!membership.userGroups) return memberOf;

    // Iterate over the groups
    for (const group of membership?.userGroups) {
      // Set flag on the group to block population of the members field
      group.membersPopulationEnabled = false;
      const community = group.community;
      const organisation = group.organisation;

      if (community) {
        this.addGroupToEntity(memberOf.communities, community, group);
        group.community = undefined;
      } else if (organisation) {
        this.addGroupToEntity(memberOf.organisations, organisation, group);
        group.organisation = undefined;
      }
    }

    return memberOf;
  }
}
