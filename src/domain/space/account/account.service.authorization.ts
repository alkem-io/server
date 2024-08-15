import { Injectable } from '@nestjs/common';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { AccountService } from './account.service';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAccount } from './account.interface';
import { TemplatesSetAuthorizationService } from '@domain/template/templates-set/templates.set.service.authorization';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { SpaceAuthorizationService } from '../space/space.service.authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import {
  CREDENTIAL_RULE_TYPES_ACCOUNT_AUTHORIZATION_RESET,
  CREDENTIAL_RULE_TYPES_ACCOUNT_CHILD_ENTITIES,
  CREDENTIAL_RULE_TYPES_ACCOUNT_MANAGE,
  CREDENTIAL_RULE_TYPES_GLOBAL_SPACE_READ,
} from '@common/constants/authorization/credential.rule.types.constants';
import { AgentAuthorizationService } from '@domain/agent/agent/agent.service.authorization';
import { VirtualContributorAuthorizationService } from '@domain/community/virtual-contributor/virtual.contributor.service.authorization';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { AccountHostService } from '../account.host/account.host.service';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { CommunityPolicyService } from '@domain/community/community-policy/community.policy.service';
import { CommunityRole } from '@common/enums/community.role';
import { StorageAggregatorAuthorizationService } from '@domain/storage/storage-aggregator/storage.aggregator.service.authorization';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { POLICY_RULE_ACCOUNT_CREATE_VC } from '@common/constants/authorization/policy.rule.constants';
import { InnovationPackAuthorizationService } from '@library/innovation-pack/innovation.pack.service.authorization';
import { ISpaceSettings } from '../space.settings/space.settings.interface';
import { SpaceSettingsService } from '../space.settings/space.settings.service';
import { InnovationHubAuthorizationService } from '@domain/innovation-hub/innovation.hub.service.authorization';

@Injectable()
export class AccountAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private agentAuthorizationService: AgentAuthorizationService,
    private templatesSetAuthorizationService: TemplatesSetAuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private spaceAuthorizationService: SpaceAuthorizationService,
    private virtualContributorAuthorizationService: VirtualContributorAuthorizationService,
    private innovationPackAuthorizationService: InnovationPackAuthorizationService,
    private communityPolicyService: CommunityPolicyService,
    private storageAggregatorAuthorizationService: StorageAggregatorAuthorizationService,
    private innovationHubAuthorizationService: InnovationHubAuthorizationService,
    private spaceSettingsService: SpaceSettingsService,
    private accountService: AccountService,
    private accountHostService: AccountHostService
  ) {}

  async applyAuthorizationPolicy(
    accountInput: IAccount
  ): Promise<IAuthorizationPolicy[]> {
    const account = await this.accountService.getAccountOrFail(
      accountInput.id,
      {
        relations: {
          agent: true,
          space: {
            community: {
              policy: true,
            },
          },
          library: true,
          defaults: true,
          virtualContributors: true,
          innovationPacks: true,
          innovationHubs: true,
          storageAggregator: true,
        },
      }
    );
    if (!account.space) {
      throw new RelationshipNotFoundException(
        `Unable to load Account with entities at start of auth reset: ${account.id} `,
        LogContext.ACCOUNT
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    // Ensure always applying from a clean state
    account.authorization = this.authorizationPolicyService.reset(
      account.authorization
    );
    account.authorization.anonymousReadAccess = false;
    account.authorization =
      this.platformAuthorizationService.inheritRootAuthorizationPolicy(
        account.authorization
      );

    account.authorization = await this.extendAuthorizationPolicy(
      account,
      account.authorization
    );
    account.authorization = this.appendPrivilegeRules(account.authorization);
    account.authorization = await this.authorizationPolicyService.save(
      account.authorization
    );
    updatedAuthorizations.push(account.authorization);

    const childUpdatedAuthorizations =
      await this.applyAuthorizationPolicyForChildEntities(account);
    updatedAuthorizations.push(...childUpdatedAuthorizations);

    // And cascade into the space if there is one
    if (!account.space) {
      throw new RelationshipNotFoundException(
        `No space on account for resetting: ${account.id} `,
        LogContext.ACCOUNT
      );
    }
    const spaceAuthorizations =
      await this.spaceAuthorizationService.applyAuthorizationPolicy(
        account.space
      );
    updatedAuthorizations.push(...spaceAuthorizations);

    return updatedAuthorizations;
  }
  public async getClonedAccountAuthExtendedForChildEntities(
    account: IAccount
  ): Promise<IAuthorizationPolicy> {
    if (!account.space) {
      throw new RelationshipNotFoundException(
        `Unable to load Account with entities at start of auth reset: ${account.id} `,
        LogContext.ACCOUNT
      );
    }
    let clonedAccountAuth =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        account.authorization
      );

    const communityPolicy = this.spaceAuthorizationService.getCommunityPolicy(
      account.space
    );
    const spaceSettings = this.spaceSettingsService.getSettings(
      account.space.settingsStr
    );

    const hostCredentials =
      await this.accountHostService.getHostCredentials(account);

    clonedAccountAuth = this.extendAuthorizationPolicyForChildEntities(
      clonedAccountAuth,
      communityPolicy,
      spaceSettings,
      hostCredentials
    );
    return clonedAccountAuth;
  }

  public async applyAuthorizationPolicyForChildEntities(
    account: IAccount
  ): Promise<IAuthorizationPolicy[]> {
    if (
      !account.agent ||
      !account.space ||
      !account.space.community ||
      !account.space.community.policy ||
      !account.library ||
      !account.defaults ||
      !account.virtualContributors ||
      !account.innovationPacks ||
      !account.storageAggregator ||
      !account.innovationHubs
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load Account with entities at start of auth reset: ${account.id} `,
        LogContext.ACCOUNT
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    const clonedAccountAuth =
      await this.getClonedAccountAuthExtendedForChildEntities(account);

    const agentAuthorization =
      this.agentAuthorizationService.applyAuthorizationPolicy(
        account.agent,
        account.authorization
      );
    updatedAuthorizations.push(agentAuthorization);

    // For certain child entities allow the space admin also pretty much full control
    const libraryAuthorizations =
      await this.templatesSetAuthorizationService.applyAuthorizationPolicy(
        account.library,
        clonedAccountAuth
      );
    updatedAuthorizations.push(...libraryAuthorizations);

    const storageAuthorizations =
      await this.storageAggregatorAuthorizationService.applyAuthorizationPolicy(
        account.storageAggregator,
        account.authorization
      );
    updatedAuthorizations.push(...storageAuthorizations);

    account.defaults.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        account.defaults.authorization,
        clonedAccountAuth
      );

    for (const vc of account.virtualContributors) {
      const updatedVcAuthorizations =
        await this.virtualContributorAuthorizationService.applyAuthorizationPolicy(
          vc,
          clonedAccountAuth
        );
      updatedAuthorizations.push(...updatedVcAuthorizations);
    }

    for (const ip of account.innovationPacks) {
      const innovationPackAuthorizations =
        await this.innovationPackAuthorizationService.applyAuthorizationPolicy(
          ip,
          clonedAccountAuth
        );
      updatedAuthorizations.push(...innovationPackAuthorizations);
    }

    for (const innovationHub of account.innovationHubs) {
      const updatedInnovationHubAuthorizations =
        await this.innovationHubAuthorizationService.applyAuthorizationPolicy(
          innovationHub,
          clonedAccountAuth
        );
      updatedAuthorizations.push(...updatedInnovationHubAuthorizations);
    }

    return updatedAuthorizations;
  }

  private async extendAuthorizationPolicy(
    account: IAccount,
    authorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy> {
    if (!authorization) {
      throw new EntityNotInitializedException(
        'Authorization definition not found for account',
        LogContext.ACCOUNT
      );
    }

    const hostCredentials =
      await this.accountHostService.getHostCredentials(account);

    const newRules: IAuthorizationPolicyRuleCredential[] = [];
    // By default it is world visible. TODO: work through the logic on this
    authorization.anonymousReadAccess = true;

    // Allow global admins to reset authorization, manage platform settings
    const authorizationReset =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.AUTHORIZATION_RESET,
          AuthorizationPrivilege.PLATFORM_ADMIN,
        ],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        CREDENTIAL_RULE_TYPES_ACCOUNT_AUTHORIZATION_RESET
      );
    authorizationReset.cascade = false;
    newRules.push(authorizationReset);

    // Allow Global Spaces Read to view Spaces + contents
    const globalSpacesReader =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.READ],
        [AuthorizationCredential.GLOBAL_SPACES_READER],
        CREDENTIAL_RULE_TYPES_GLOBAL_SPACE_READ
      );
    newRules.push(globalSpacesReader);

    // Allow hosts (users = self mgmt, org = org admin) to manage their own account
    const userHostsRule = this.authorizationPolicyService.createCredentialRule(
      [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
      ],
      [...hostCredentials],
      CREDENTIAL_RULE_TYPES_ACCOUNT_MANAGE
    );
    userHostsRule.cascade = false;
    newRules.push(userHostsRule);

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );
  }

  private extendAuthorizationPolicyForChildEntities(
    authorization: IAuthorizationPolicy | undefined,
    communityPolicy: ICommunityPolicy,
    spaceSettings: ISpaceSettings,
    hostCredentials: ICredentialDefinition[]
  ): IAuthorizationPolicy {
    if (!authorization) {
      throw new EntityNotInitializedException(
        'Authorization definition not found for account',
        LogContext.ACCOUNT
      );
    }
    const newRules: IAuthorizationPolicyRuleCredential[] = [];
    // If there is a root space, then also allow the admins to manage the account for now
    const accountChildEntitiesManage = hostCredentials;
    const spaceAdminCriterias =
      this.communityPolicyService.getCredentialsForRole(
        communityPolicy,
        spaceSettings,
        CommunityRole.ADMIN
      );
    accountChildEntitiesManage.push(...spaceAdminCriterias);
    if (accountChildEntitiesManage.length !== 0) {
      const accountChildEntities =
        this.authorizationPolicyService.createCredentialRule(
          [
            AuthorizationPrivilege.CREATE,
            AuthorizationPrivilege.READ,
            AuthorizationPrivilege.UPDATE,
            AuthorizationPrivilege.DELETE,
            AuthorizationPrivilege.GRANT,
          ],
          accountChildEntitiesManage,
          CREDENTIAL_RULE_TYPES_ACCOUNT_CHILD_ENTITIES
        );
      newRules.push(accountChildEntities);
    }
    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );
  }

  private appendPrivilegeRules(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicy {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    const createVcPrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.CREATE_VIRTUAL_CONTRIBUTOR],
      AuthorizationPrivilege.CREATE,
      POLICY_RULE_ACCOUNT_CREATE_VC
    );
    privilegeRules.push(createVcPrivilege);

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }
}
