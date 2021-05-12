import { LogContext } from '@common/enums';
import { ForbiddenException } from '@common/exceptions';
import { UserNotRegisteredException } from '@common/exceptions/registration.exception';
import { UserInfo } from '@core/authentication/user-info';
import { IAuthorizationRule } from '@core/authorization/rules';
import { AuthorizationCredential } from '../authorization.credential';

export class AuthorizationRuleCommunityMember implements IAuthorizationRule {
  communityID: number;
  priority: number;

  constructor(parentArg: any, priority?: number) {
    this.communityID = parentArg.id;
    if (this.communityID == -1) {
      throw new ForbiddenException(
        'Community Member guard not set up properly.',
        LogContext.AUTH
      );
    }

    this.priority = priority ?? 1000;
  }

  execute(userInfo: UserInfo): boolean {
    if (!userInfo.user || !userInfo.user.profile) {
      throw new UserNotRegisteredException(
        `Error: Unable to find user with given email: ${userInfo.email}`
      );
    }

    const userCredentials = userInfo.user.agent?.credentials;
    if (!userCredentials) return false;
    for (const userCredential of userCredentials) {
      if (userCredential.type === AuthorizationCredential.CommunityMember) {
        if (userCredential.resourceID == this.communityID) return true;
      }
    }
    return false;
  }
}
