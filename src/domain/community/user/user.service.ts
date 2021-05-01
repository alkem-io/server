import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { ProfileService } from '@domain/community/profile/profile.service';
import { MemberOf } from './memberof.composite';
import validator from 'validator';
import { IGroupable } from '@src/common/interfaces/groupable.interface';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import {
  UpdateUserInput,
  CreateUserInput,
  User,
  IUser,
} from '@domain/community/user';
import { DeleteUserInput } from './user.dto.delete';
import { ICapability } from '@domain/common/capability';

@Injectable()
export class UserService {
  constructor(
    private profileService: ProfileService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createUser(userData: CreateUserInput): Promise<IUser> {
    await this.validateUserProfileCreationRequest(userData);

    const user: IUser = User.create(userData);
    user.profile = await this.profileService.createProfile(
      userData.profileData
    );

    // Need to save to get the object identifiers assigned
    const savedUser = await this.userRepository.save(user);
    this.logger.verbose?.(
      `Created a new user with id: ${savedUser.id}`,
      LogContext.COMMUNITY
    );

    return savedUser;
  }

  async removeUser(deleteData: DeleteUserInput): Promise<IUser> {
    const userID = deleteData.ID;
    const user = await this.getUserByIdOrFail(userID);
    const { id } = user;

    if (user.profile) {
      await this.profileService.deleteProfile(user.profile.id);
    }

    const result = await this.userRepository.remove(user as User);
    return {
      ...result,
      id,
    };
  }

  async validateUserProfileCreationRequest(
    userData: CreateUserInput
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

  // todo: rename to remove groups when all authorization is via capabilities
  async getUserWithGroupsCapabilities(
    email: string
  ): Promise<IUser | undefined> {
    const user = await this.getUserByEmail(email, {
      relations: ['userGroups', 'capabilities'],
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
  async updateUser(userInput: UpdateUserInput): Promise<IUser> {
    const user = await this.getUserOrFail(userInput.ID);

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

    await this.userRepository.save(user);

    // Check the tagsets
    if (userInput.profileData && user.profile) {
      await this.profileService.updateProfile(userInput.profileData);
    }

    const populatedUser = await this.getUserByIdOrFail(user.id);

    return populatedUser;
  }

  async getCapabilities(user: IUser): Promise<ICapability[]> {
    const userWithCapabilities = await this.getUserByIdOrFail(user.id, {
      relations: ['capabilities'],
    });
    const capabilities = userWithCapabilities.capabilities;
    if (!capabilities)
      throw new RelationshipNotFoundException(
        `Unable to load capabilities for user ${user.id} `,
        LogContext.COMMUNITY
      );
    return capabilities;
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
