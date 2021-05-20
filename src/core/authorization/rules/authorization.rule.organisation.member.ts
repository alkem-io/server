import {
  ForbiddenException,
  UserNotRegisteredException,
} from '@common/exceptions';
import { UserInfo } from '@core/authentication/user-info';
import { IAuthorizationRule } from '@core/authorization/rules';
import { LogContext, AuthorizationCredential } from '@common/enums';

export class AuthorizationRuleOrganisationMember implements IAuthorizationRule {
  organisationID: string;
  priority: number;

  constructor(parentArg: any, priority?: number) {
    this.organisationID = parentArg.id;
    if (!this.organisationID || this.organisationID.length == 0) {
      throw new ForbiddenException(
        'Organisation Member guard not set up properly.',
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
      if (userCredential.type === AuthorizationCredential.OrganisationMember) {
        if (userCredential.resourceID === this.organisationID) return true;
      }
    }
    return false;
  }
}
