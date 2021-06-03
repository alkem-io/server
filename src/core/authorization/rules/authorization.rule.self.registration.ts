import { LogContext } from '@common/enums';
import { ForbiddenException } from '@common/exceptions';
import { AgentInfo } from '@core/authentication/agent-info';
import { IAuthorizationRule } from '@core/authorization/rules';

export class AuthorizationRuleSelfRegistration implements IAuthorizationRule {
  userEmail?: string;
  priority: number;

  constructor(fieldName: string, args: any, priority?: number) {
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

  execute(agentInfo: AgentInfo): boolean {
    // createUser mutation
    if (this.userEmail && this.userEmail === agentInfo.email) {
      return true;
    }
    return false;
  }
}
