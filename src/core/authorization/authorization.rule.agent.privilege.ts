import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { ForbiddenException } from '@common/exceptions';
import { AgentInfo } from '@core/authentication/agent-info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';

export class AuthorizationRuleAgentPrivilege {
  privilege: AuthorizationPrivilege;
  priority: number;
  fieldParent: any;
  fieldName: string;

  constructor(
    private authorizationService: AuthorizationService,
    privilege: AuthorizationPrivilege,
    fieldParent: any,
    fieldName: string,
    priority?: number
  ) {
    this.privilege = privilege;
    this.fieldParent = fieldParent;
    this.fieldName = fieldName;
    this.priority = priority ?? 1000;
    if (!this.fieldParent) {
      throw new ForbiddenException(
        `Error: Unable to identify field parent for priviilege check: ${privilege}`,
        LogContext.AUTH
      );
    }
  }

  execute(agentInfo: AgentInfo): boolean {
    const accessGranted = this.authorizationService.isAccessGranted(
      agentInfo,
      this.fieldParent.authorization,
      this.privilege
    );
    if (!accessGranted) {
      const fieldParentType = this.fieldParent.__proto__.constructor.name;
      const errorMsg = `User (${agentInfo.email}) does not have credentials that grant '${this.privilege}' access to ${fieldParentType}.${this.fieldName}`;
      this.authorizationService.logCredentialCheckFailDetails(
        errorMsg,
        agentInfo,
        this.fieldParent.authorization
      );
      throw new ForbiddenAuthorizationPolicyException(
        errorMsg,
        this.privilege,
        this.fieldParent.authorization.id,
        agentInfo.userID
      );
    }

    return true;
  }
}
