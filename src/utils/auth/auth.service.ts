import { UserService } from '@domain/user/user.service';
import { Injectable } from '@nestjs/common';
import { AuthenticationException } from '@utils/error-handling/exceptions';
import jwt_decode from 'jwt-decode';
import { IUser } from '@domain/user/user.interface';
import { UserFactoryService } from '@domain/user/user.factory.service';
import { UserInput } from '@domain/user/user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly userFactoryService: UserFactoryService
  ) {}

  async getUserFromToken(encodedToken: any): Promise<[IUser, string]> {
    const token = (await jwt_decode(encodedToken)) as any;

    if (!token.email) throw new AuthenticationException('Token email missing!');
    let knownUser = await this.userService.getUserWithGroups(token.email);

    if (!knownUser) {
      // User does not yet have a profile on the platform, create one
      const userData = new UserInput();
      userData.email = token.email;
      // todo: log a msg that we are creating a new user based on token data; fill out more of the user profile data? catch + rethrow any exception?
      knownUser = await this.userFactoryService.createUser(userData);
    }

    return [knownUser, token];
  }
}
