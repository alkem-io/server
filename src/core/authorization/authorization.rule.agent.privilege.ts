import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { ForbiddenException } from '@common/exceptions';
import { AgentInfo } from '@core/authentication/agent-info';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';

export class AuthorizationRuleAgentPrivilege {
  privilege: AuthorizationPrivilege;
  priority: number;
  fieldParent: any;
  fieldName: string;

  constructor(
    private authorizationEngine: AuthorizationEngineService,
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
    const accessGranted = this.authorizationEngine.isAccessGranted(
      agentInfo.credentials,
      this.fieldParent.authorization,
      this.privilege
    );
    if (!accessGranted) {
      const errorMsg = `User (${agentInfo.email}) does not have credentials that grant '${this.privilege}' access to ${this.fieldParent}.${this.fieldName}`;
      this.authorizationEngine.logCredentialCheckFailDetails(
        errorMsg,
        agentInfo,
        this.fieldParent.authorization
      );
      throw new ForbiddenException(errorMsg, LogContext.AUTH);
    }

    return true;
  }
}
