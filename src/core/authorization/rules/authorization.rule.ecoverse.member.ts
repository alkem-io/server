import { LogContext } from '@common/enums';
import { ForbiddenException } from '@common/exceptions';
import { IAuthorizationRule } from '@core/authorization/rules';
import { IUser } from '@domain/community/user';
import { AuthorizationCredential } from '../authorization.credential';

export class AuthorizationRuleEcoverseMember implements IAuthorizationRule {
  communityID: number;

  constructor(parentArg: any) {
    this.communityID = parentArg.id;
    if (this.communityID == -1) {
      throw new ForbiddenException(
        'Ecoverse Member guard not set up properly.',
        LogContext.AUTH
      );
    }
  }

  evaluate(user: IUser): boolean {
    const userCredentials = user.credentials;
    if (!userCredentials) return false;
    for (const userCredential of userCredentials) {
      if (userCredential.type === AuthorizationCredential.CommunityMember) {
        if (userCredential.resourceID == this.communityID) return true;
      }
    }
    return false;
  }
}
