import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  NotSupportedException,
} from '@utils/error-handling/exceptions';
import { LogContext } from '@utils/logging/logging.contexts';
import { ProfileService } from '@domain/profile/profile.service';
import { MemberOf } from './memberof.composite';
import { UserInput } from './user.dto';
import { User } from './user.entity';
import { IUser } from './user.interface';
import validator from 'validator';
import { IGroupable } from '@interfaces/groupable.interface';
import { IUserGroup } from '@domain/user-group/user-group.interface';
@Injectable()
@Injectable()
export class UserService {
  constructor(
    private profileService: ProfileService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

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
      .leftJoinAndSelect('userGroup.ecoverse', 'ecoverse')
      .leftJoinAndSelect('userGroup.challenge', 'challenge')
      .leftJoinAndSelect('userGroup.opportunity', 'opportunity')
      .leftJoinAndSelect('userGroup.organisation', 'organisation')
      .where('user.id = :userId')
      .setParameters({ userId: `${user.id}` })
      .getOne();

    const memberOf = new MemberOf();
    memberOf.groups = [];
    memberOf.challenges = [];
    memberOf.opportunities = [];
    memberOf.organisations = [];

    if (!membership) return memberOf;
    if (!membership.userGroups) return memberOf;

    // First get the list of challenges + orgs + groups to return
    for (const group of membership?.userGroups) {
      // Set flag on the group to block population of the members field
      group.membersPopulationEnabled = false;
      const ecoverse = group.ecoverse;
      const challenge = group.challenge;
      const opportunity = group.opportunity;
      const organisation = group.organisation;

      if (ecoverse) {
        // ecoverse group
        memberOf.groups.push(group);
      }
      if (challenge) {
        // challenge group
        this.addGroupToEntity(memberOf.challenges, challenge, group);
        group.challenge = undefined;
      }
      if (opportunity) {
        this.addGroupToEntity(memberOf.opportunities, opportunity, group);
        group.opportunity = undefined;
      }
      if (organisation) {
        this.addGroupToEntity(memberOf.organisations, organisation, group);
        group.organisation = undefined;
      }
    }

    return memberOf;
  }

  async updateUserByEmail(email: string, userInput: UserInput): Promise<IUser> {
    const user = await this.getUserByEmailOrFail(email);
    return await this.updateUser(user.id, userInput);
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
}
