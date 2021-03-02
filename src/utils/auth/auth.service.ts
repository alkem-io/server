import { UserService } from '@domain/user/user.service';
import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  AuthenticationException,
  EntityNotInitializedException,
} from '@utils/error-handling/exceptions';
import jwt_decode from 'jwt-decode';
import { IUser } from '@domain/user/user.interface';
import { RestrictedGroupNames } from '@domain/user-group/user-group.entity';
import { LogContext } from '@utils/logging/logging.contexts';
import { UserGroupService } from '@domain/user-group/user-group.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly userGroupService: UserGroupService
  ) {}

  async getUserFromToken(encodedToken: any): Promise<[IUser, string]> {
    const token = (await jwt_decode(encodedToken)) as any;

    if (!token.email) throw new AuthenticationException('Token email missing!');
    const knownUser = await this.userService.getUserWithGroups(token.email);

    if (!knownUser) {
      throw new AuthenticationException(
        `User profile for ${token.email} account not found!`
      );
    }

    return [knownUser, token];
  }

  async getUserFromJwtPayload(jwtPayload: any): Promise<IUser> {
    const knownUser = await this.userService.getUserWithGroups(
      jwtPayload.email
    );

    return knownUser as IUser;
  }

  async isUserInRole(
    email: string,
    roles: RestrictedGroupNames[]
  ): Promise<boolean> {
    const user = await this.userService.getUserWithGroups(email);

    if (!user)
      throw new ForbiddenException(
        `User account with email ${email} doesn't have a profile!`
      );

    if (!user.userGroups)
      throw new EntityNotInitializedException(
        `User profile for user ${email} not properly initialized!`,
        LogContext.AUTH
      );

    for (const role of roles) {
      const userRole = role as string;
      if (this.userGroupService.hasGroupWithName(user, userRole)) return true;
    }

    return false;
  }
}
