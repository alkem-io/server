import { UserService } from '@domain/user/user.service';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { EntityNotInitializedException } from '@utils/error-handling/exceptions';
import { RestrictedGroupNames } from '@domain/user-group/user-group.entity';
import { LogContext } from '@utils/logging/logging.contexts';

@Injectable()
export class AuthorisationService {
  constructor(private readonly userService: UserService) {}

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

    return roles.some(
      role => role === RestrictedGroupNames.GlobalAdmins || roles.includes(role)
    );
  }
}

export enum AuthorisationRoles {
  NewUser = 'new-user',
  AuthenticatedUser = 'authenticated-user',
  Members = 'members',
  CommunityAdmins = 'community-admins',
  EcoverseAdmins = 'ecoverse-admins',
  GlobalAdmins = 'global-admins',
}
