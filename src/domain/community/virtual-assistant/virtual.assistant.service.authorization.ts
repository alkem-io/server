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

    // GLOBAL admins / support may manage the assistant actor (incl. the admin
    // capability grant — PLATFORM_ADMIN is additionally enforced at the mutation).
    const adminManage =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
          AuthorizationPrivilege.PLATFORM_ADMIN,
        ],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        CREDENTIAL_RULE_TYPES_VIRTUAL_ASSISTANT_MANAGE
      );
    newRules.push(adminManage);

    // All registered users (and anonymous) may READ the assistant actor.
    const registeredRead =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.READ],
        [
          AuthorizationCredential.GLOBAL_REGISTERED,
          AuthorizationCredential.GLOBAL_ANONYMOUS,
        ],
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
