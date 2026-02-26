import {
  CREDENTIAL_RULE_ACCOUNT_ADMIN_MANAGE,
  CREDENTIAL_RULE_TYPES_VC_GLOBAL_COMMUNITY_READ,
  CREDENTIAL_RULE_TYPES_VC_GLOBAL_SUPPORT_MANAGE,
  CREDENTIAL_RULE_VIRTUAL_PLATFORM_SETTINGS,
  POLICY_RULE_READ_ABOUT,
} from '@common/constants';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { SearchVisibility } from '@common/enums/search.visibility';
import { RelationshipNotFoundException } from '@common/exceptions';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { KnowledgeBaseAuthorizationService } from '@domain/common/knowledge-base/knowledge.base.service.authorization';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { IAccount } from '@domain/space/account/account.interface';
import { Injectable } from '@nestjs/common';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { AiServerAdapter } from '@services/adapters/ai-server-adapter/ai.server.adapter';
import { IVirtualContributor } from './virtual.contributor.interface';
import { VirtualContributorService } from './virtual.contributor.service';

@Injectable()
export class VirtualContributorAuthorizationService {
  constructor(
    private virtualService: VirtualContributorService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private knowledgeBaseAuthorizations: KnowledgeBaseAuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private aiServerAdapter: AiServerAdapter
  ) {}

  async applyAuthorizationPolicy(
    virtualInput: IVirtualContributor
  ): Promise<IAuthorizationPolicy[]> {
    const virtualContributor =
      await this.virtualService.getVirtualContributorByIdOrFail(
        virtualInput.id,
        {
          relations: {
            account: {
              spaces: true,
            },
            authorization: true, profile: true,
            knowledgeBase: true,
          },
        }
      );
    if (
      !virtualContributor.account ||
      !virtualContributor.account.spaces ||
      !virtualContributor.profile ||
      !virtualContributor.knowledgeBase
    )
      throw new RelationshipNotFoundException(
        'Unable to load entities for VC',
        LogContext.COMMUNITY,
        { virtualContributorID: virtualContributor.id }
      );
    const updatedAuthorizations: IAuthorizationPolicy[] = [];
    const accountAdminCredential: ICredentialDefinition = {
      type: AuthorizationCredential.ACCOUNT_ADMIN,
      resourceID: virtualContributor.account.id,
    };

    // Key: what are the credentials that should be able to read about this VC
    const credentialCriteriasWithAccessToVC =
      await this.getCredentialsWithVisibilityOfVirtualContributor(
        virtualContributor.searchVisibility,
        virtualContributor.account
      );

    virtualContributor.authorization =
      this.resetToBaseVirtualContributorAuthorization(
        virtualContributor.authorization,
        accountAdminCredential
      );
    // Create a clone of the base policy, for usage with KnowledgeBase
    const clonedBaseVirtualContributorAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        virtualContributor.authorization
      );

    if (credentialCriteriasWithAccessToVC.length > 0) {
      const rule = this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.READ],
        credentialCriteriasWithAccessToVC,
        CREDENTIAL_RULE_TYPES_VC_GLOBAL_COMMUNITY_READ
      );
      rule.cascade = true;
      virtualContributor.authorization.credentialRules.push(rule);
    }
    virtualContributor.authorization =
      this.authorizationPolicyService.appendPrivilegeAuthorizationRuleMapping(
        virtualContributor.authorization,
        AuthorizationPrivilege.READ,
        [AuthorizationPrivilege.READ_ABOUT],
        POLICY_RULE_READ_ABOUT
      );

    updatedAuthorizations.push(virtualContributor.authorization);

    // Clone the authorization policy to ensure the profile is always publicly readable
    // (similar to User profiles) so that VCs can be displayed as message authors in public spaces
    let profileParentAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        virtualContributor.authorization
      );
    profileParentAuthorization =
      this.authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess(
        profileParentAuthorization,
        AuthorizationPrivilege.READ
      );

    const profileAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        virtualContributor.profile.id,
        profileParentAuthorization
      );
    updatedAuthorizations.push(...profileAuthorizations);

    // Note: No separate actor/agent auth inheritance needed -
    // virtualContributor.authorization IS actor.authorization via getter delegation

    // TODO: this is a hack to deal with the fact that the AI Persona has an authorization policy that uses the VC's account
    const aiPersonaAuthorizations =
      await this.aiServerAdapter.applyAuthorizationOnAiPersona(
        virtualContributor.aiPersonaID,
        virtualContributor.authorization
      );
    updatedAuthorizations.push(...aiPersonaAuthorizations);

    // The KnowledgeBase needs to start from a reset VC auth, and then use the criterias with access to go further
    const knowledgeBaseAuthorizations =
      await this.knowledgeBaseAuthorizations.applyAuthorizationPolicy(
        virtualContributor.knowledgeBase,
        clonedBaseVirtualContributorAuthorization,
        credentialCriteriasWithAccessToVC,
        virtualContributor.settings.privacy.knowledgeBaseContentVisible
      );
    updatedAuthorizations.push(...knowledgeBaseAuthorizations);

    updatedAuthorizations.push(virtualContributor.authorization);
    return updatedAuthorizations;
  }

  private async getCredentialsWithVisibilityOfVirtualContributor(
    searchVisibility: SearchVisibility,
    account: IAccount
  ): Promise<ICredentialDefinition[]> {
    const credentialCriteriasWithAccess: ICredentialDefinition[] = [];

    switch (searchVisibility) {
      case SearchVisibility.PUBLIC: {
        // PUBLIC visibility: accessible to anonymous and registered users globally
        const globalAnonymousRegistered =
          this.authorizationPolicyService.getCredentialDefinitionsAnonymousRegistered();
        credentialCriteriasWithAccess.push(...globalAnonymousRegistered);
        break;
      }

      case SearchVisibility.ACCOUNT: {
        // ACCOUNT visibility: only accessible within the scope of the account
        const accountSpaceMemberCredentials =
          this.getAccountSpaceMemberCredentials(account);
        if (accountSpaceMemberCredentials.length > 0) {
          credentialCriteriasWithAccess.push(...accountSpaceMemberCredentials);
        }
        break;
      }

      case SearchVisibility.HIDDEN:
        // HIDDEN visibility: no additional global access credentials
        break;
    }

    return credentialCriteriasWithAccess;
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
        CREDENTIAL_RULE_VIRTUAL_PLATFORM_SETTINGS
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
          AuthorizationPrivilege.RECEIVE_NOTIFICATIONS,
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

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      updatedAuthorization,
      newRules
    );
  }

  private getAccountSpaceMemberCredentials(account: IAccount) {
    if (!account.spaces) {
      throw new RelationshipNotFoundException(
        'Unable to load Account with spaces to get membership credentials',
        LogContext.ACCOUNT,
        { accountID: account.id }
      );
    }
    const accountMemberCredentials: ICredentialDefinition[] = [];
    for (const space of account.spaces) {
      const spaceMemberCredential: ICredentialDefinition = {
        type: AuthorizationCredential.SPACE_MEMBER,
        resourceID: space.id,
      };
      accountMemberCredentials.push(spaceMemberCredential);
    }
    return accountMemberCredentials;
  }
}
