import { Inject, Injectable, LoggerService } from '@nestjs/common';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { SpaceService } from './space.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ISpace } from './space.interface';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { CommunityAuthorizationService } from '@domain/community/community/community.service.authorization';
import { StorageAggregatorAuthorizationService } from '@domain/storage/storage-aggregator/storage.aggregator.service.authorization';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { CollaborationAuthorizationService } from '@domain/collaboration/collaboration/collaboration.service.authorization';
import { ContextAuthorizationService } from '@domain/context/context/context.service.authorization';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { CommunityRoleType } from '@common/enums/community.role';
import {
  POLICY_RULE_SPACE_CREATE_SUBSPACE,
  CREDENTIAL_RULE_SPACE_MEMBERS_READ,
  CREDENTIAL_RULE_SPACE_ADMINS,
  CREDENTIAL_RULE_MEMBER_CREATE_SUBSPACE,
  CREDENTIAL_RULE_SUBSPACE_ADMINS,
  CREDENTIAL_RULE_SPACE_ADMIN_DELETE_SUBSPACE,
  CREDENTIAL_RULE_TYPES_SPACE_PLATFORM_SETTINGS,
  CREDENTIAL_RULE_TYPES_GLOBAL_SPACE_READ,
} from '@common/constants';
import { EntityNotInitializedException } from '@common/exceptions';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { SpaceSettingsService } from '../space.settings/space.settings.service';
import { SpaceLevel } from '@common/enums/space.level';
import { AgentAuthorizationService } from '@domain/agent/agent/agent.service.authorization';
import { ISpaceSettings } from '../space.settings/space.settings.interface';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { IRoleSet } from '@domain/access/role-set';
import { TemplatesManagerAuthorizationService } from '@domain/template/templates-manager/templates.manager.service.authorization';
import { LicenseAuthorizationService } from '@domain/common/license/license.service.authorization';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';

@Injectable()
export class SpaceAuthorizationService {
  constructor(
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private agentAuthorizationService: AgentAuthorizationService,
    private roleSetService: RoleSetService,
    private storageAggregatorAuthorizationService: StorageAggregatorAuthorizationService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private contextAuthorizationService: ContextAuthorizationService,
    private communityAuthorizationService: CommunityAuthorizationService,
    private collaborationAuthorizationService: CollaborationAuthorizationService,
    private templatesManagerAuthorizationService: TemplatesManagerAuthorizationService,
    private spaceService: SpaceService,
    private spaceSettingsService: SpaceSettingsService,
    private licenseAuthorizationService: LicenseAuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async applyAuthorizationPolicy(
    spaceID: string,
    providedParentAuthorization?: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const space = await this.spaceService.getSpaceOrFail(spaceID, {
      relations: {
        authorization: {
          parentAuthorizationPolicy: true,
        },
        parentSpace: {
          community: {
            roleSet: true,
          },
        },
        agent: true,
        community: {
          roleSet: true,
        },
        collaboration: true,
        context: true,
        profile: true,
        storageAggregator: true,
        subspaces: true,
        templatesManager: true,
        license: true,
      },
    });
    if (
      !space.authorization ||
      !space.community ||
      !space.community.roleSet ||
      !space.subspaces
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load Space with entities at start of auth reset: ${space.id} `,
        LogContext.SPACES
      );
    }

    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    const spaceVisibility = space.visibility;
    const spaceSettings = this.spaceSettingsService.getSettings(
      space.settingsStr
    );
    const isPrivate = spaceSettings.privacy.mode === SpacePrivacyMode.PRIVATE;

    // Store the provided parent authorization so that later resets can happen
    // without having access to it.
    // Note: reset does not remove this setting.
    if (providedParentAuthorization) {
      space.authorization.parentAuthorizationPolicy =
        providedParentAuthorization;
    }

    // Note: later will need additional logic here for Templates
    // Allow the parent admins to also delete subspaces
    let parentSpaceAdminCredentialCriterias: ICredentialDefinition[] = [];
    switch (space.level) {
      case SpaceLevel.SPACE:
        space.authorization = this.resetToLevelZeroSpaceAuthorization(
          space.authorization
        );
        if (!isPrivate) {
          space.authorization.anonymousReadAccess = true;
        }
        break;
      case SpaceLevel.CHALLENGE:
      case SpaceLevel.OPPORTUNITY:
        if (isPrivate) {
          // Key: private get the base space authorization setup, that is then extended
          space.authorization = this.resetToLevelZeroSpaceAuthorization(
            space.authorization
          );
          space.authorization = await this.extendPrivateSubspaceAdmins(
            space.authorization,
            space.community.roleSet,
            spaceSettings
          );
        } else {
          // Pick up the parent authorization
          const parentAuthorization =
            this.getParentAuthorizationPolicyOrFail(space);
          space.authorization =
            this.authorizationPolicyService.inheritParentAuthorization(
              space.authorization,
              parentAuthorization
            );
          space.authorization.anonymousReadAccess = true;
        }
        // For subspace, the parent space admins credentials should be allowed to delete
        const parentSpaceCommunity = space.parentSpace?.community;
        if (!parentSpaceCommunity || !parentSpaceCommunity.roleSet) {
          throw new RelationshipNotFoundException(
            `Unable to load Space with parent RoleSet in auth reset: ${space.id} `,
            LogContext.SPACES
          );
        }
        parentSpaceAdminCredentialCriterias =
          await this.roleSetService.getCredentialsForRole(
            parentSpaceCommunity.roleSet,
            CommunityRoleType.ADMIN,
            spaceSettings
          );
        break;
    }

    let spaceMembershipAllowed = true;
    // Extend rules depending on the Visibility
    switch (spaceVisibility) {
      case SpaceVisibility.ACTIVE:
      case SpaceVisibility.DEMO:
        space.authorization = await this.extendAuthorizationPolicyLocal(
          space.authorization,
          space.community.roleSet,
          spaceSettings,
          parentSpaceAdminCredentialCriterias
        );

        break;
      case SpaceVisibility.ARCHIVED:
        // ensure it has visibility privilege set to private
        space.authorization.anonymousReadAccess = false;
        spaceMembershipAllowed = false;
        break;
    }

    // Save before proparagating to child entities
    space.authorization = await this.authorizationPolicyService.save(
      space.authorization
    );
    updatedAuthorizations.push(space.authorization);

    // Cascade down
    // propagate authorization rules for child entities
    const childAuthorzations = await this.propagateAuthorizationToChildEntities(
      space,
      spaceSettings,
      spaceMembershipAllowed
    );
    updatedAuthorizations.push(...childAuthorzations);

    // Finally propagate to child spaces
    for (const subspace of space.subspaces) {
      const updatedSubspaceAuthorizations = await this.applyAuthorizationPolicy(
        subspace.id,
        space.authorization
      );
      this.logger.verbose?.(
        `Subspace (${subspace.id}) auth reset: saving ${updatedSubspaceAuthorizations.length} authorizations`,
        LogContext.AUTH
      );
      await this.authorizationPolicyService.saveAll(
        updatedSubspaceAuthorizations
      );
    }

    return updatedAuthorizations;
  }

  private getParentAuthorizationPolicyOrFail(
    space: ISpace
  ): IAuthorizationPolicy | never {
    // This will either pick up the one that was passed in or the stored reference
    const parentAuthorization = space.authorization?.parentAuthorizationPolicy;
    if (!parentAuthorization) {
      throw new RelationshipNotFoundException(
        `Space auth reset: Non L0 or private Space found without a parent Authorization set: ${space.id} `,
        LogContext.SPACES
      );
    }
    return parentAuthorization;
  }

  public async propagateAuthorizationToChildEntities(
    space: ISpace,
    spaceSettings: ISpaceSettings,
    spaceMembershipAllowed: boolean
  ): Promise<IAuthorizationPolicy[]> {
    if (
      !space.authorization ||
      !space.agent ||
      !space.collaboration ||
      !space.community ||
      !space.community.roleSet ||
      !space.context ||
      !space.profile ||
      !space.storageAggregator ||
      !space.license
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load entities on auth reset for space base ${space.id} `,
        LogContext.SPACES
      );
    }

    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    const isSubspaceCommunity = space.level !== SpaceLevel.SPACE;

    const communityAuthorizations =
      await this.communityAuthorizationService.applyAuthorizationPolicy(
        space.community.id,
        space.authorization,
        spaceSettings,
        spaceMembershipAllowed,
        isSubspaceCommunity
      );
    updatedAuthorizations.push(...communityAuthorizations);

    const collaborationAuthorizations =
      await this.collaborationAuthorizationService.applyAuthorizationPolicy(
        space.collaboration,
        space.authorization,
        space.community.roleSet,
        spaceSettings
      );
    updatedAuthorizations.push(...collaborationAuthorizations);

    const agentAuthorization =
      this.agentAuthorizationService.applyAuthorizationPolicy(
        space.agent,
        space.authorization
      );
    updatedAuthorizations.push(agentAuthorization);

    const storageAuthorizations =
      await this.storageAggregatorAuthorizationService.applyAuthorizationPolicy(
        space.storageAggregator,
        space.authorization
      );
    updatedAuthorizations.push(...storageAuthorizations);

    const licenseAuthorizations =
      this.licenseAuthorizationService.applyAuthorizationPolicy(
        space.license,
        space.authorization
      );
    updatedAuthorizations.push(...licenseAuthorizations);

    // Level zero space only entities
    if (space.level === SpaceLevel.SPACE) {
      if (!space.templatesManager) {
        throw new RelationshipNotFoundException(
          `Unable to load templatesManager on level zero space for auth reset ${space.id} `,
          LogContext.SPACES
        );
      }

      const templatesManagerAuthorizations =
        await this.templatesManagerAuthorizationService.applyAuthorizationPolicy(
          space.templatesManager.id,
          space.authorization
        );
      updatedAuthorizations.push(...templatesManagerAuthorizations);
    }

    /// For fields that always should be available
    // Clone the authorization policy
    const clonedAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        space.authorization
      );
    // To ensure that profile + context on a space are always publicly visible, even for private subspaces
    clonedAuthorization.anonymousReadAccess = true;

    const profileAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        space.profile.id,
        clonedAuthorization
      );
    updatedAuthorizations.push(...profileAuthorizations);

    const contextAuthorizations =
      await this.contextAuthorizationService.applyAuthorizationPolicy(
        space.context,
        clonedAuthorization
      );
    updatedAuthorizations.push(...contextAuthorizations);

    return updatedAuthorizations;
  }

  private extendPrivilegeRuleCreateSubspace(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicy {
    // Ensure that CREATE also allows CREATE_CHALLENGE
    const createSubspacePrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.CREATE_SUBSPACE],
      AuthorizationPrivilege.CREATE,
      POLICY_RULE_SPACE_CREATE_SUBSPACE
    );
    this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      [createSubspacePrivilege]
    );

    return authorization;
  }

  private async extendAuthorizationPolicyLocal(
    authorization: IAuthorizationPolicy,
    roleSet: IRoleSet,
    spaceSettings: ISpaceSettings,
    deletionCredentialCriterias: ICredentialDefinition[]
  ): Promise<IAuthorizationPolicy> {
    this.extendPrivilegeRuleCreateSubspace(authorization);

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    if (deletionCredentialCriterias.length !== 0) {
      const deleteSubspaces =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.DELETE],
          deletionCredentialCriterias,
          CREDENTIAL_RULE_SPACE_ADMIN_DELETE_SUBSPACE
        );
      deleteSubspaces.cascade = false;
      newRules.push(deleteSubspaces);
    }

    const memberCriteras = await this.roleSetService.getCredentialsForRole(
      roleSet,
      CommunityRoleType.MEMBER,
      spaceSettings
    );
    const spaceMember = this.authorizationPolicyService.createCredentialRule(
      [AuthorizationPrivilege.READ],
      memberCriteras,
      CREDENTIAL_RULE_SPACE_MEMBERS_READ
    );
    newRules.push(spaceMember);

    const spaceAdminCriterias = await this.roleSetService.getCredentialsForRole(
      roleSet,
      CommunityRoleType.ADMIN,
      spaceSettings
    );
    const spaceAdmin = this.authorizationPolicyService.createCredentialRule(
      [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
        AuthorizationPrivilege.GRANT,
      ],
      spaceAdminCriterias,
      CREDENTIAL_RULE_SPACE_ADMINS
    );
    newRules.push(spaceAdmin);

    const collaborationSettings = spaceSettings.collaboration;
    if (collaborationSettings.allowMembersToCreateSubspaces) {
      const criteria = await this.getContributorCriteria(
        roleSet,
        spaceSettings
      );
      const createSubspacePrilegeRule =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.CREATE_SUBSPACE],
          criteria,
          CREDENTIAL_RULE_MEMBER_CREATE_SUBSPACE
        );
      createSubspacePrilegeRule.cascade = false;
      newRules.push(createSubspacePrilegeRule);
    }

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
  }

  private async getContributorCriteria(
    roleSet: IRoleSet,
    spaceSettings: ISpaceSettings
  ): Promise<ICredentialDefinition[]> {
    const memberCriteria = await this.roleSetService.getCredentialsForRole(
      roleSet,
      CommunityRoleType.MEMBER,
      spaceSettings
    );
    const collaborationSettings = spaceSettings.collaboration;
    if (
      collaborationSettings.inheritMembershipRights &&
      spaceSettings.privacy.mode === SpacePrivacyMode.PUBLIC
    ) {
      const parentCredential =
        await this.roleSetService.getDirectParentCredentialForRole(
          roleSet,
          CommunityRoleType.MEMBER
        );
      if (parentCredential) memberCriteria.push(parentCredential);
    }
    return memberCriteria;
  }

  private async extendPrivateSubspaceAdmins(
    authorization: IAuthorizationPolicy | undefined,
    roleSet: IRoleSet,
    spaceSettings: ISpaceSettings
  ): Promise<IAuthorizationPolicy> {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${JSON.stringify(roleSet)}`,
        LogContext.SPACES
      );
    const rules: IAuthorizationPolicyRuleCredential[] = [];
    const credentials =
      await this.roleSetService.getCredentialsForRoleWithParents(
        roleSet,
        CommunityRoleType.ADMIN,
        spaceSettings
      );

    const spaceAdminCriteria = [...credentials];
    const subspaceSpaceAdmins =
      this.authorizationPolicyService.createCredentialRule(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.GRANT,
          AuthorizationPrivilege.DELETE,
        ],
        spaceAdminCriteria,
        CREDENTIAL_RULE_SUBSPACE_ADMINS
      );
    rules.push(subspaceSpaceAdmins);

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      rules
    );

    return authorization;
  }

  private resetToLevelZeroSpaceAuthorization(
    authorizationPolicy: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    let updatedAuthorization =
      this.authorizationPolicyService.reset(authorizationPolicy);
    updatedAuthorization.anonymousReadAccess = false;
    updatedAuthorization =
      this.platformAuthorizationService.inheritRootAuthorizationPolicy(
        updatedAuthorization
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // Allow global admins to manage platform settings
    // Later: to allow account admins to some settings?
    const platformSettings =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.PLATFORM_ADMIN],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        CREDENTIAL_RULE_TYPES_SPACE_PLATFORM_SETTINGS
      );
    platformSettings.cascade = false;
    newRules.push(platformSettings);

    // Allow Global Spaces Read to view Spaces
    const globalSpacesReader =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.READ],
        [AuthorizationCredential.GLOBAL_SPACES_READER],
        CREDENTIAL_RULE_TYPES_GLOBAL_SPACE_READ
      );
    newRules.push(globalSpacesReader);

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      updatedAuthorization,
      newRules
    );
  }
}
