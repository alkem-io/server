import { LogContext } from '@common/enums';
import { ForbiddenException } from '@common/exceptions';
import { UserInfo } from '@core/authentication/user-info';
import { IAuthorizationRule } from '@core/authorization/rules';

export class AuthorizationRuleSelfManagement implements IAuthorizationRule {
  userEmail?: string;
  operation!: string;
  priority: number;

  constructor(fieldName: string, args: any, priority?: number) {
    this.operation = fieldName;
    this.priority = priority ?? 1000;

    if (fieldName === 'createUser') {
      this.userEmail = args.userData.email;
    } else {
      // Failsafe: if decorator SelfManagement was used then one of the fieldNames must have matched
      throw new ForbiddenException(
        'User self-management not setup properly for requested access.',
        LogContext.AUTH
      );
    }
  }

  execute(userInfo: UserInfo): boolean {
    // createUser mutation
    if (this.userEmail && this.userEmail === userInfo.email) {
      return true;
    }
    return false;
  }
}
