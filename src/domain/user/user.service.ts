import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { FindConditions, FindOneOptions, Repository } from 'typeorm';
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
    private userRepository: Repository<User>,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
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
    if (this.isValidEmail(userID)) {
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
      this.logger.verbose(`No user with email ${email} exists!`);
      return undefined;
    }

    if (!user.userGroups) {
      this.logger.verbose(
        `User with email ${email} doesn't belong to any groups!`
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
        `No user with provided account UPN ${accountUpn} exists!`
      );
      return undefined;
    }

    if (!user.userGroups) {
      this.logger.verbose(
        `User with provided account UPN ${accountUpn} doesn't belong to any groups!`
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

  async createUser(
    userData: UserInput,
    validateExistingUser = true
  ): Promise<IUser> {
    // Check if a valid email address was given
    const newUserEmail = userData.email;
    // Validate that the user has some key fields et
    if (!this.isValidEmail(newUserEmail))
      throw new Error(
        `Valid email address required to create a user: ${newUserEmail}`
      );

    // Check if a user with the given email already exists
    if (validateExistingUser) {
      const existingUser = await this.getUserByEmail(newUserEmail);
      if (existingUser)
        throw new Error(
          `A user with the provided email address: ${newUserEmail} already exists!`
        );
    }

    // Ok to create a new user + save
    const user = User.create(userData);
    await this.initialiseMembers(user);
    await this.userRepository.save(user);

    this.logger.verbose(`User ${userData.email} was created!`);

    return user;
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
