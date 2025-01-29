import { Injectable } from '@nestjs/common';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { RelationshipNotFoundException } from '@common/exceptions';
import { VirtualContributorService } from './virtual.contributor.service';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import {
  CREDENTIAL_RULE_ACCOUNT_ADMIN_MANAGE,
  CREDENTIAL_RULE_TYPES_VC_GLOBAL_COMMUNITY_READ,
  CREDENTIAL_RULE_TYPES_VC_GLOBAL_SUPPORT_MANAGE,
  CREDENTIAL_RULE_VIRTUAL_CONTRIBUTOR_PLATFORM_SETTINGS,
} from '@common/constants';
import { IVirtualContributor } from './virtual.contributor.interface';
import { AgentAuthorizationService } from '@domain/agent/agent/agent.service.authorization';
import { AiPersonaAuthorizationService } from '../ai-persona/ai.persona.service.authorization';
import { KnowledgeBaseAuthorizationService } from '@domain/common/knowledge-base/knowledge.base.service.authorization';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';

@Injectable()
export class VirtualContributorAuthorizationService {
  constructor(
    private virtualService: VirtualContributorService,
    private agentAuthorizationService: AgentAuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private aiPersonaAuthorizationService: AiPersonaAuthorizationService,
    private knowledgeBaseAuthorizations: KnowledgeBaseAuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  async applyAuthorizationPolicy(
    virtualInput: IVirtualContributor
  ): Promise<IAuthorizationPolicy[]> {
    const virtual = await this.virtualService.getVirtualContributorOrFail(
      virtualInput.id,
      {
        relations: {
          account: true,
          profile: true,
          agent: true,
          aiPersona: true,
          knowledgeBase: true,
        },
      }
    );
    if (
      !virtual.account ||
      !virtual.profile ||
      !virtual.agent ||
      !virtual.aiPersona ||
      !virtual.knowledgeBase ||
      !virtual.account
    )
      throw new RelationshipNotFoundException(
        `Unable to load entities for virtual: ${virtual.id} `,
        LogContext.COMMUNITY
      );
    const updatedAuthorizations: IAuthorizationPolicy[] = [];
    const accountAdminCredential: ICredentialDefinition = {
      type: AuthorizationCredential.ACCOUNT_ADMIN,
      resourceID: virtual.account.id,
    };

    virtual.authorization = this.resetToBaseVirtualContributorAuthorization(
      virtual.authorization,
      accountAdminCredential
    );
    // Allow everyone to see the VirtualContributor for now; note do not cascade to children
    virtual.authorization =
      this.authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess(
        virtual.authorization,
        AuthorizationPrivilege.READ,
        false
      );

    updatedAuthorizations.push(virtual.authorization);

    // NOTE: Clone the authorization policy to ensure the changes are local to profile
    let clonedVirtualAuthorizationAnonymousAccess =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        virtual.authorization
      );
    // To ensure that profile on an virtual is always publicly visible, even for non-authenticated users
    clonedVirtualAuthorizationAnonymousAccess =
      this.authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess(
        clonedVirtualAuthorizationAnonymousAccess,
        AuthorizationPrivilege.READ
      );
    const profileAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        virtual.profile.id,
        clonedVirtualAuthorizationAnonymousAccess
      );
    updatedAuthorizations.push(...profileAuthorizations);

    const agentAuthorization =
      this.agentAuthorizationService.applyAuthorizationPolicy(
        virtual.agent,
        virtual.authorization
      );
    updatedAuthorizations.push(agentAuthorization);

    const aiPersonaAuthorization =
      this.aiPersonaAuthorizationService.applyAuthorizationPolicy(
        virtual.aiPersona,
        clonedVirtualAuthorizationAnonymousAccess
      );
    updatedAuthorizations.push(aiPersonaAuthorization);

    // Decide whether the knowledge base inherits from the virtual without public access, or
    // from the cloned authorization with public access added
    let knowledgeBaseParentAuthorization = virtual.authorization;
    if (virtual.settings.privacy.knowledgeBaseContentVisible) {
      knowledgeBaseParentAuthorization =
        clonedVirtualAuthorizationAnonymousAccess;
    }

    const knowledgeBaseAuthorizations =
      await this.knowledgeBaseAuthorizations.applyAuthorizationPolicy(
        virtual.knowledgeBase,
        knowledgeBaseParentAuthorization
      );
    updatedAuthorizations.push(...knowledgeBaseAuthorizations);

    return updatedAuthorizations;
  }

  private createCredentialRuleAnonymousRegisteredUserRead(): IAuthorizationPolicyRuleCredential {
    const globalCommunityRead =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.READ],
        [
          AuthorizationCredential.GLOBAL_REGISTERED,
          AuthorizationCredential.GLOBAL_ANONYMOUS,
        ],
        CREDENTIAL_RULE_TYPES_VC_GLOBAL_COMMUNITY_READ
      );

    return globalCommunityRead;
  }

  private resetToBaseVirtualContributorAuthorization(
    authorizationPolicy: IAuthorizationPolicy | undefined,
    accountAdminCredential: ICredentialDefinition
  ): IAuthorizationPolicy {
    let updatedAuthorization =
      this.authorizationPolicyService.reset(authorizationPolicy);
    updatedAuthorization =
      this.platformAuthorizationService.inheritRootAuthorizationPolicy(
        updatedAuthorization
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // Allow global admins to manage platform settings
    const platformSettings =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.PLATFORM_ADMIN],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        CREDENTIAL_RULE_VIRTUAL_CONTRIBUTOR_PLATFORM_SETTINGS
      );
    platformSettings.cascade = false;
    newRules.push(platformSettings);

    // Allow Global Spaces Read to view VCs
    const globalSpacesReader =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.READ],
        [AuthorizationCredential.GLOBAL_COMMUNITY_READ],
        CREDENTIAL_RULE_TYPES_VC_GLOBAL_COMMUNITY_READ
      );
    newRules.push(globalSpacesReader);

    const accountAdminManage =
      this.authorizationPolicyService.createCredentialRule(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
          AuthorizationPrivilege.CONTRIBUTE,
        ],
        [accountAdminCredential],
        CREDENTIAL_RULE_ACCOUNT_ADMIN_MANAGE
      );
    newRules.push(accountAdminManage);

    // TODO: rule that for now allows global support ability to manage VCs, this to be removed later
    const globalSupportManage =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ],
        [AuthorizationCredential.GLOBAL_SUPPORT],
        CREDENTIAL_RULE_TYPES_VC_GLOBAL_SUPPORT_MANAGE
      );
    newRules.push(globalSupportManage);

    const globalCommunityRead =
      this.createCredentialRuleAnonymousRegisteredUserRead();
    globalCommunityRead.cascade = false;
    newRules.push(globalCommunityRead);

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      updatedAuthorization,
      newRules
    );
  }
}
