import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { ForbiddenException } from '@common/exceptions';
import { UserInfo } from '@core/authentication/user-info';
import { IAuthorizationRule } from '@core/authorization/rules';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';

export class AuthorizationRulePrivilege implements IAuthorizationRule {
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

  execute(userInfo: UserInfo): boolean {
    const accessGranted = this.authorizationEngine.isAccessGranted(
      userInfo.credentials,
      this.fieldParent.authorizationRules,
      this.privilege
    );
    if (!accessGranted)
      throw new ForbiddenException(
        `User (${userInfo.email}) does not have credentials that grant '${this.privilege}' access to ${this.fieldParent}.${this.fieldName}`,
        LogContext.AUTH
      );

    return true;
  }
}
