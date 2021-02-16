import { ProfileService } from '@domain/profile/profile.service';
import { UserService } from '@domain/user/user.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ValidationException } from '@utils/error-handling/exceptions';
import { LogContext } from '@utils/logging/logging.contexts';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { UserInput } from './user.dto';
import { User } from './user.entity';
import { IUser } from './user.interface';

@Injectable()
export class UserFactoryService {
  constructor(
    private userService: UserService,
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
    this.userService.updateLastModified(user);
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
    const populatedUser = await this.userService.getUserByIdOrFail(user.id);

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
    const user = await this.userService.getUserByIdOrFail(userID);
    const result = await this.userRepository.remove(user as User);
    return result;
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
    const userCheck = await this.userService.getUserByEmail(userData.email);
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
}
