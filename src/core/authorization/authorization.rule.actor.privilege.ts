import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { ForbiddenException } from '@common/exceptions';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';

export class AuthorizationRuleActorPrivilege {
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
        `Error: Unable to identify field parent for privilege check: ${privilege}`,
        LogContext.AUTH
      );
    }
  }

  execute(actorContext: ActorContext): boolean {
    const accessGranted = this.authorizationService.isAccessGranted(
      actorContext,
      this.fieldParent.authorization,
      this.privilege
    );
    if (!accessGranted) {
      let authorizationID = '';
      if (this.fieldParent.authorization) {
        authorizationID = this.fieldParent.authorization.id;
      }
      const fieldParentType = this.fieldParent.__proto__.constructor.name;
      const errorMsg = `User (${actorContext.actorID}) does not have credentials that grant '${this.privilege}' access to ${fieldParentType}.${this.fieldName} with id '${this.fieldParent.id}' with authorization: ${authorizationID}`;
      this.authorizationService.logCredentialCheckFailDetails(
        errorMsg,
        actorContext,
        this.fieldParent.authorization
      );
      throw new ForbiddenAuthorizationPolicyException(
        errorMsg,
        this.privilege,
        this.fieldParent.authorization.id,
        actorContext.actorID
      );
    }

    return true;
  }
}
