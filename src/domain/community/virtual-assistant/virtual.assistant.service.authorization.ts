import {
  CREDENTIAL_RULE_TYPES_VIRTUAL_ASSISTANT_MANAGE,
  CREDENTIAL_RULE_TYPES_VIRTUAL_ASSISTANT_READ,
} from '@common/constants';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Injectable } from '@nestjs/common';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { VirtualAssistantService } from './virtual.assistant.service';

/**
 * Authorization for the singleton `virtual-assistant` platform actor.
 *
 * It is a platform-level singleton (no account, no community), so the policy is
 * deliberately simple: GLOBAL admins manage it (including the admin
 * capability-grant mutation, FR-019); all registered users may READ it (so it
 * can be displayed as the attribution author of assistant actions, FR-016).
 */
@Injectable()
export class VirtualAssistantAuthorizationService {
  constructor(
    private readonly virtualAssistantService: VirtualAssistantService,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    private readonly platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  async applyAuthorizationPolicy(): Promise<IAuthorizationPolicy[]> {
    const virtualAssistant =
      await this.virtualAssistantService.getSingletonOrFail({
        relations: { authorization: true },
      });

    let authorization = this.authorizationPolicyService.reset(
      virtualAssistant.authorization
    );
    authorization =
      this.platformAuthorizationService.inheritRootAuthorizationPolicy(
        authorization
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // 027-platform-role-redesign (T074/T076): the assistant actor's management
    // rule moves off `{global-admin, global-support}` + the `PLATFORM_ADMIN`
    // catch-all onto Platform Operations Admin, which spec §Target global role
    // model row 5 gives "AI persona & assistant-capability config" (A11). The
    // discovery path (`platformAdmin.virtualAssistant`) and the capability
    // mutation are gated on the same privilege, so one role owns the whole
    // surface rather than three legacy credentials sharing it.
    const adminManage =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
          AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN,
        ],
        [AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN],
        CREDENTIAL_RULE_TYPES_VIRTUAL_ASSISTANT_MANAGE
      );
    newRules.push(adminManage);

    // All registered users may READ the assistant actor (per the slice
    // contract — so it can be displayed as the attribution author of assistant
    // actions, FR-016). Anonymous access is deliberately NOT granted.
    const registeredRead =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.READ],
        [AuthorizationCredential.GLOBAL_REGISTERED],
        CREDENTIAL_RULE_TYPES_VIRTUAL_ASSISTANT_READ
      );
    newRules.push(registeredRead);

    authorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    virtualAssistant.authorization = authorization;
    return [authorization];
  }
}
