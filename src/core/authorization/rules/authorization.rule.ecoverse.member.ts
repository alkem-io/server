import { LogContext } from '@common/enums';
import { ForbiddenException } from '@common/exceptions';
import { IAuthorizationRule } from '@core/authorization/rules';
import { IUser } from '@domain/community/user';
import { AuthorizationCredential } from '../authorization.credential';

export class AuthorizationRuleEcoverseMember implements IAuthorizationRule {
  communityID: number;
  priority: number;

  constructor(parentArg: any, priority?: number) {
    this.communityID = parentArg.id;
    if (this.communityID == -1) {
      throw new ForbiddenException(
        'Ecoverse Member guard not set up properly.',
        LogContext.AUTH
      );
    }

    this.priority = priority ?? 1000;
  }

  execute(user: IUser): boolean {
    const userCredentials = user.agent?.credentials;
    if (!userCredentials) return false;
    for (const userCredential of userCredentials) {
      if (userCredential.type === AuthorizationCredential.CommunityMember) {
        if (userCredential.resourceID == this.communityID) return true;
      }
    }
    return false;
  }
}
