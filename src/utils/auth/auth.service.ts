import { UserService } from '@domain/user/user.service';
import { Injectable } from '@nestjs/common';
import { AuthenticationException } from '@utils/error-handling/exceptions';
import jwt_decode from 'jwt-decode';
import { IUser } from '@domain/user/user.interface';
import { UserInput } from '@domain/user/user.dto';

@Injectable()
export class AuthService {
  constructor(private readonly userService: UserService) {}

  async getUserFromToken(encodedToken: any): Promise<[IUser, string]> {
    const token = (await jwt_decode(encodedToken)) as any;

    if (!token.email) throw new AuthenticationException('Token email missing!');
    let knownUser = await this.userService.getUserWithGroups(token.email);

    if (!knownUser) {
      // todo: this needs to be replaced with a custom exception
      const userData = new UserInput();
      userData.email = token.email;
      knownUser = await this.userService.createUser(userData);
      if (!knownUser) {
        throw new AuthenticationException(
          `Unable to create user profile for email: ${token.email}`
        );
      }
    }

    return [knownUser, token];
  }
}
