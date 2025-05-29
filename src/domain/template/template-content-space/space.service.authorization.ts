import { Inject, Injectable, LoggerService } from '@nestjs/common';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ITemplateContentSpace } from './templateContentSpace.interface';
import { TemplateContentSpaceVisibility } from '@common/enums/templateContentSpace.visibility';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { CommunityAuthorizationService } from '@domain/community/community/community.service.authorization';
import { StorageAggregatorAuthorizationService } from '@domain/storage/storage-aggregator/storage.aggregator.service.authorization';
import { CollaborationAuthorizationService } from '@domain/collaboration/collaboration/collaboration.service.authorization';
import { TemplateContentSpacePrivacyMode } from '@common/enums/templateContentSpace.privacy.mode';
import { RoleName } from '@common/enums/role.name';
import {
  POLICY_RULE_SPACE_CREATE_SUBSPACE,
  CREDENTIAL_RULE_SPACE_MEMBERS_READ,
  CREDENTIAL_RULE_SPACE_ADMINS,
  CREDENTIAL_RULE_MEMBER_CREATE_SUBSPACE,
  CREDENTIAL_RULE_SPACE_ADMIN_DELETE_SUBSPACE,
  CREDENTIAL_RULE_TYPES_SPACE_PLATFORM_SETTINGS,
  CREDENTIAL_RULE_TYPES_GLOBAL_SPACE_READ,
  POLICY_RULE_READ_ABOUT,
} from '@common/constants';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { TemplateContentSpaceLevel } from '@common/enums/templateContentSpace.level';
import { AgentAuthorizationService } from '@domain/agent/agent/agent.service.authorization';
import { ITemplateContentSpaceSettings } from '../templateContentSpace.settings/templateContentSpace.settings.interface';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { IRoleSet } from '@domain/access/role-set';
import { LicenseAuthorizationService } from '@domain/common/license/license.service.authorization';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { EntityNotFoundException } from '@common/exceptions';
import { TemplateContentSpaceAboutAuthorizationService } from '../templateContentSpace.about/templateContentSpace.about.service.authorization';
import { TemplateContentSpaceLookupService } from '../templateContentSpace.lookup/templateContentSpace.lookup.service';

@Injectable()
export class TemplateContentSpaceAuthorizationService {
  constructor(
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private agentAuthorizationService: AgentAuthorizationService,
    private roleSetService: RoleSetService,
    private storageAggregatorAuthorizationService: StorageAggregatorAuthorizationService,
    private communityAuthorizationService: CommunityAuthorizationService,
    private collaborationAuthorizationService: CollaborationAuthorizationService,
    private templateContentSpaceAboutAuthorizationService: TemplateContentSpaceAboutAuthorizationService,
    private templateContentSpaceLookupService: TemplateContentSpaceLookupService,
    private licenseAuthorizationService: LicenseAuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async applyAuthorizationPolicy(
    templateContentSpaceID: string,
    providedParentAuthorization?: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const templateContentSpace =
      await this.templateContentSpaceLookupService.getTemplateContentSpaceOrFail(
        templateContentSpaceID,
        {
          relations: {
            authorization: {
              parentAuthorizationPolicy: true,
            },
            parentTemplateContentSpace: {
              community: {
                roleSet: true,
              },
              parentTemplateContentSpace: true,
            },
            agent: true,
            community: {
              roleSet: true,
            },
            collaboration: true,
            about: {
              profile: true,
            },
            storageAggregator: true,
            subtemplateContentSpaces: true,
            license: true,
            account: true,
          },
        }
      );
    if (
      !templateContentSpace.authorization ||
      !templateContentSpace.community ||
      !templateContentSpace.community.roleSet ||
      !templateContentSpace.subtemplateContentSpaces ||
      !templateContentSpace.license
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load TemplateContentSpace with entities at start of auth reset: ${templateContentSpace.id} `,
        LogContext.SPACES
      );
    }

    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    const templateContentSpaceVisibility = templateContentSpace.visibility;
    const templateContentSpaceSettings = templateContentSpace.settings;
    const isPrivate =
      templateContentSpaceSettings.privacy.mode ===
      TemplateContentSpacePrivacyMode.PRIVATE;

    // Store the provided parent authorization so that later resets can happen
    // without having access to it.
    // Note: reset does not remove this setting.
    if (providedParentAuthorization) {
      templateContentSpace.authorization.parentAuthorizationPolicy =
        providedParentAuthorization;
    }

    // Key: what are the credentials that should be able to reach this TemplateContentSpace, either as a top level templateContentSpace,
    // or subtemplateContentSpace in public templateContentSpace, or members in a private templateContentSpace who can see subtemplateContentSpaces there etc
    const credentialCriteriasWithAccess =
      await this.getCredentialsWithVisibilityOfTemplateContentSpace(
        templateContentSpace
      );

    // Note: later will need additional logic here for Templates
    let parentTemplateContentSpaceRoleSet: IRoleSet | undefined;
    switch (templateContentSpace.level) {
      case TemplateContentSpaceLevel.L0: {
        templateContentSpace.authorization =
          this.resetToPrivateLevelZeroTemplateContentSpaceAuthorization(
            templateContentSpace,
            templateContentSpace.authorization
          );
        break;
      }
      case TemplateContentSpaceLevel.L1:
      case TemplateContentSpaceLevel.L2: {
        if (isPrivate) {
          // Key: private get the base templateContentSpace authorization setup, that is then extended
          templateContentSpace.authorization =
            this.resetToPrivateLevelZeroTemplateContentSpaceAuthorization(
              templateContentSpace,
              templateContentSpace.authorization
            );
        } else {
          // Pick up the parent authorization
          const parentAuthorization =
            this.getParentAuthorizationPolicyOrFail(templateContentSpace);
          templateContentSpace.authorization =
            this.authorizationPolicyService.inheritParentAuthorization(
              templateContentSpace.authorization,
              parentAuthorization
            );
        }

        const parentTemplateContentSpaceCommunity =
          templateContentSpace.parentTemplateContentSpace?.community;
        if (
          !parentTemplateContentSpaceCommunity ||
          !parentTemplateContentSpaceCommunity.roleSet
        ) {
          throw new RelationshipNotFoundException(
            `Unable to load TemplateContentSpace with parent RoleSet in auth reset: ${templateContentSpace.id} `,
            LogContext.SPACES
          );
        }
        parentTemplateContentSpaceRoleSet =
          parentTemplateContentSpaceCommunity.roleSet;
        break;
      }
    }

    let templateContentSpaceMembershipAllowed = true;
    // Extend rules depending on the Visibility
    switch (templateContentSpaceVisibility) {
      case TemplateContentSpaceVisibility.ACTIVE:
      case TemplateContentSpaceVisibility.DEMO:
        templateContentSpace.authorization =
          await this.extendAuthorizationPolicyLocal(
            templateContentSpace.authorization,
            templateContentSpace.community.roleSet,
            templateContentSpaceSettings,
            credentialCriteriasWithAccess,
            parentTemplateContentSpaceRoleSet
          );

        break;
      case TemplateContentSpaceVisibility.ARCHIVED:
        // ensure it has visibility privilege set to private
        templateContentSpaceMembershipAllowed = false;
        break;
    }

    // If can READ, then can of course READ_ABOUT
    templateContentSpace.authorization =
      this.authorizationPolicyService.appendPrivilegeAuthorizationRuleMapping(
        templateContentSpace.authorization,
        AuthorizationPrivilege.READ,
        [
          AuthorizationPrivilege.READ_ABOUT,
          AuthorizationPrivilege.READ_LICENSE,
        ],
        POLICY_RULE_READ_ABOUT
      );
    // Ensure that CREATE also allows CREATE_SUBSPACE
    templateContentSpace.authorization =
      this.authorizationPolicyService.appendPrivilegeAuthorizationRuleMapping(
        templateContentSpace.authorization,
        AuthorizationPrivilege.CREATE,
        [AuthorizationPrivilege.CREATE_SUBSPACE],
        POLICY_RULE_SPACE_CREATE_SUBSPACE
      );

    // Save before propagating to child entities
    templateContentSpace.authorization =
      await this.authorizationPolicyService.save(
        templateContentSpace.authorization
      );
    updatedAuthorizations.push(templateContentSpace.authorization);

    // Cascade down
    // propagate authorization rules for child entities
    const childAuthorizations =
      await this.propagateAuthorizationToChildEntities(
        templateContentSpace,
        templateContentSpaceSettings,
        templateContentSpaceMembershipAllowed,
        credentialCriteriasWithAccess
      );
    updatedAuthorizations.push(...childAuthorizations);

    // Finally propagate to child templateContentSpaces
    for (const subtemplateContentSpace of templateContentSpace.subtemplateContentSpaces) {
      const updatedSubtemplateContentSpaceAuthorizations =
        await this.applyAuthorizationPolicy(
          subtemplateContentSpace.id,
          templateContentSpace.authorization
        );
      this.logger.verbose?.(
        `SubtemplateContentSpace (${subtemplateContentSpace.id}) auth reset: saving ${updatedSubtemplateContentSpaceAuthorizations.length} authorizations`,
        LogContext.AUTH
      );
      await this.authorizationPolicyService.saveAll(
        updatedSubtemplateContentSpaceAuthorizations
      );
    }

    return updatedAuthorizations;
  }

  private async getCredentialsWithVisibilityOfTemplateContentSpace(
    templateContentSpace: ITemplateContentSpace
  ): Promise<ICredentialDefinition[]> {
    const credentialCriteriasWithAccess: ICredentialDefinition[] = [];
    const globalAnonymousRegistered =
      this.authorizationPolicyService.getCredentialDefinitionsAnonymousRegistered();

    switch (templateContentSpace.level) {
      case TemplateContentSpaceLevel.L0: {
        credentialCriteriasWithAccess.push(...globalAnonymousRegistered);

        // Always allow account admins to see the L0 templateContentSpaces in their account
        const accountAdminCredential =
          this.getAccountAdminCredentialForTemplateContentSpaceL0OrFail(
            templateContentSpace
          );
        credentialCriteriasWithAccess.push(accountAdminCredential);
        break;
      }

      case TemplateContentSpaceLevel.L1:
        credentialCriteriasWithAccess.push(
          ...(await this.getL1TemplateContentSpaceLevelCredentials(
            templateContentSpace,
            globalAnonymousRegistered
          ))
        );
        break;

      case TemplateContentSpaceLevel.L2:
        credentialCriteriasWithAccess.push(
          ...(await this.getL2TemplateContentSpaceLevelCredentials(
            templateContentSpace,
            globalAnonymousRegistered
          ))
        );
        break;
    }

    // An invitee also can always have visibility
    credentialCriteriasWithAccess.push({
      type: AuthorizationCredential.SPACE_MEMBER_INVITEE,
      resourceID: templateContentSpace.id,
    });

    return credentialCriteriasWithAccess;
  }

  private getAccountAdminCredentialForTemplateContentSpaceL0OrFail(
    templateContentSpace: ITemplateContentSpace
  ): ICredentialDefinition {
    const account = templateContentSpace.account;
    if (!account) {
      throw new RelationshipNotFoundException(
        `Unable to load account for L0 templateContentSpace ${templateContentSpace.id} `,
        LogContext.SPACES
      );
    }
    const accountAdminCredential: ICredentialDefinition = {
      type: AuthorizationCredential.ACCOUNT_ADMIN,
      resourceID: account.id,
    };
    return accountAdminCredential;
  }

  /**
   * Determines which credentials have access for a L1 templateContentSpace.
   */
  private async getL1TemplateContentSpaceLevelCredentials(
    templateContentSpace: ITemplateContentSpace,
    globalAnonymousRegistered: ICredentialDefinition[]
  ): Promise<ICredentialDefinition[]> {
    const parentTemplateContentSpace =
      templateContentSpace.parentTemplateContentSpace;
    if (
      !parentTemplateContentSpace ||
      !parentTemplateContentSpace.community?.roleSet
    ) {
      throw new EntityNotFoundException(
        `Parent templateContentSpace or parentTemplateContentSpace.community.roleSet not found for templateContentSpace ${templateContentSpace.id}`,
        LogContext.SPACES
      );
    }

    const isParentTemplateContentSpacePublic =
      parentTemplateContentSpace.settings.privacy.mode ===
      TemplateContentSpacePrivacyMode.PUBLIC;
    if (isParentTemplateContentSpacePublic) {
      // If the parent templateContentSpace is PUBLIC, allow anonymous/registered.
      return globalAnonymousRegistered;
    } else {
      // Otherwise, return the parent templateContentSpace’s MEMBER credentials.
      return this.roleSetService.getCredentialsForRole(
        parentTemplateContentSpace.community.roleSet,
        RoleName.MEMBER,
        parentTemplateContentSpace.settings
      );
    }
  }

  /**
   * Determines which credentials have access for an L2 templateContentSpace.
   */
  private async getL2TemplateContentSpaceLevelCredentials(
    templateContentSpace: ITemplateContentSpace,
    globalAnonymousRegistered: ICredentialDefinition[]
  ): Promise<ICredentialDefinition[]> {
    const parentTemplateContentSpace =
      templateContentSpace.parentTemplateContentSpace;
    const parentParentTemplateContentSpace =
      parentTemplateContentSpace?.parentTemplateContentSpace;

    if (
      !parentTemplateContentSpace ||
      !parentTemplateContentSpace.community ||
      !parentParentTemplateContentSpace
    ) {
      throw new EntityNotFoundException(
        `Parent templateContentSpaces not found for templateContentSpace ${templateContentSpace.id}`,
        LogContext.SPACES
      );
    }

    const isParentTemplateContentSpacePublic =
      parentTemplateContentSpace.settings.privacy.mode ===
      TemplateContentSpacePrivacyMode.PUBLIC;
    const isGrandparentTemplateContentSpacePublic =
      parentParentTemplateContentSpace.settings.privacy.mode ===
      TemplateContentSpacePrivacyMode.PUBLIC;

    // - Public templateContentSpace, Public challenge ⇒ anyone
    // - Public templateContentSpace, Private challenge ⇒ challenge members
    // - Private templateContentSpace, Public challenge ⇒ challenge + templateContentSpace members
    // - Private templateContentSpace, Private challenge ⇒ challenge members
    if (isParentTemplateContentSpacePublic) {
      if (isGrandparentTemplateContentSpacePublic) {
        // ParentTemplateContentSpace is public, grandparent (the top-level templateContentSpace) is also public
        return globalAnonymousRegistered;
      } else {
        // ParentTemplateContentSpace is public, but grandparent is private ⇒ challenge members
        return this.roleSetService.getCredentialsForRoleWithParents(
          parentTemplateContentSpace.community.roleSet,
          RoleName.MEMBER,
          parentTemplateContentSpace.settings
        );
      }
    } else {
      // ParentTemplateContentSpace is private ⇒ challenge members
      return this.roleSetService.getCredentialsForRole(
        parentTemplateContentSpace.community.roleSet,
        RoleName.MEMBER,
        parentTemplateContentSpace.settings
      );
    }
  }

  private getParentAuthorizationPolicyOrFail(
    templateContentSpace: ITemplateContentSpace
  ): IAuthorizationPolicy | never {
    // This will either pick up the one that was passed in or the stored reference
    const parentAuthorization =
      templateContentSpace.authorization?.parentAuthorizationPolicy;
    if (!parentAuthorization) {
      throw new RelationshipNotFoundException(
        `TemplateContentSpace auth reset: Non L0 or private TemplateContentSpace found without a parent Authorization set: ${templateContentSpace.id} `,
        LogContext.SPACES
      );
    }
    return parentAuthorization;
  }

  public async propagateAuthorizationToChildEntities(
    templateContentSpace: ITemplateContentSpace,
    templateContentSpaceSettings: ITemplateContentSpaceSettings,
    templateContentSpaceMembershipAllowed: boolean,
    credentialCriteriasWithAccess: ICredentialDefinition[]
  ): Promise<IAuthorizationPolicy[]> {
    if (
      !templateContentSpace.authorization ||
      !templateContentSpace.agent ||
      !templateContentSpace.collaboration ||
      !templateContentSpace.community ||
      !templateContentSpace.community.roleSet ||
      !templateContentSpace.about ||
      !templateContentSpace.about.profile ||
      !templateContentSpace.storageAggregator ||
      !templateContentSpace.license
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load entities on auth reset for templateContentSpace base ${templateContentSpace.id} `,
        LogContext.SPACES
      );
    }

    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    const isSubtemplateContentSpaceCommunity =
      templateContentSpace.level !== TemplateContentSpaceLevel.L0;

    const communityAuthorizations =
      await this.communityAuthorizationService.applyAuthorizationPolicy(
        templateContentSpace.community.id,
        templateContentSpace.authorization,
        templateContentSpaceSettings,
        templateContentSpaceMembershipAllowed,
        isSubtemplateContentSpaceCommunity
      );
    updatedAuthorizations.push(...communityAuthorizations);

    const agentAuthorization =
      this.agentAuthorizationService.applyAuthorizationPolicy(
        templateContentSpace.agent,
        templateContentSpace.authorization
      );
    updatedAuthorizations.push(agentAuthorization);

    const storageAuthorizations =
      await this.storageAggregatorAuthorizationService.applyAuthorizationPolicy(
        templateContentSpace.storageAggregator,
        templateContentSpace.authorization
      );
    updatedAuthorizations.push(...storageAuthorizations);

    const collaborationAuthorizations =
      await this.collaborationAuthorizationService.applyAuthorizationPolicy(
        templateContentSpace.collaboration,
        templateContentSpace.authorization,
        templateContentSpace.community.roleSet,
        templateContentSpaceSettings
      );
    updatedAuthorizations.push(...collaborationAuthorizations);

    const licenseAuthorizations =
      this.licenseAuthorizationService.applyAuthorizationPolicy(
        templateContentSpace.license,
        templateContentSpace.authorization
      );
    updatedAuthorizations.push(...licenseAuthorizations);

    // And the children that may be read about
    const templateContentSpaceAboutExtraCredentialRules: IAuthorizationPolicyRuleCredential[] =
      [];
    switch (templateContentSpaceSettings.privacy.mode) {
      // Also for PUBLIC templateContentSpaces cascade the read on About to avoid having privilege rules everywhere
      case TemplateContentSpacePrivacyMode.PUBLIC:
      case TemplateContentSpacePrivacyMode.PRIVATE:
        const credentialRuleReadOnAbout =
          this.authorizationPolicyService.createCredentialRule(
            [AuthorizationPrivilege.READ],
            credentialCriteriasWithAccess,
            'Read access to About'
          );
        credentialRuleReadOnAbout.cascade = true;
        templateContentSpaceAboutExtraCredentialRules.push(
          credentialRuleReadOnAbout
        );
        break;
    }
    const aboutAuthorizations =
      await this.templateContentSpaceAboutAuthorizationService.applyAuthorizationPolicy(
        templateContentSpace.about.id,
        templateContentSpace.authorization,
        templateContentSpaceAboutExtraCredentialRules
      );
    updatedAuthorizations.push(...aboutAuthorizations);

    return updatedAuthorizations;
  }

  private async extendAuthorizationPolicyLocal(
    authorization: IAuthorizationPolicy,
    roleSet: IRoleSet,
    templateContentSpaceSettings: ITemplateContentSpaceSettings,
    credentialCriteriasWithAccess: ICredentialDefinition[],
    parentTemplateContentSpaceRoleSet: IRoleSet | undefined
  ): Promise<IAuthorizationPolicy> {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    switch (templateContentSpaceSettings.privacy.mode) {
      case TemplateContentSpacePrivacyMode.PUBLIC: {
        const rule = this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.READ],
          credentialCriteriasWithAccess,
          'Public templateContentSpaces content is visible to all'
        );
        rule.cascade = true;
        newRules.push(rule);
        break;
      }
      case TemplateContentSpacePrivacyMode.PRIVATE:
        const rule = this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.READ_ABOUT],
          credentialCriteriasWithAccess,
          'Private templateContentSpaces content is only visible to members'
        );
        rule.cascade = false;
        newRules.push(rule);
        break;
    }

    if (parentTemplateContentSpaceRoleSet) {
      // Allow the parent admins to also delete subtemplateContentSpaces
      const parentRoleSetAdminCredentials =
        await this.roleSetService.getCredentialsForRole(
          parentTemplateContentSpaceRoleSet,
          RoleName.ADMIN,
          templateContentSpaceSettings
        );

      if (parentRoleSetAdminCredentials.length !== 0) {
        const deleteSubtemplateContentSpaces =
          this.authorizationPolicyService.createCredentialRule(
            [AuthorizationPrivilege.DELETE],
            parentRoleSetAdminCredentials,
            CREDENTIAL_RULE_SPACE_ADMIN_DELETE_SUBSPACE
          );
        deleteSubtemplateContentSpaces.cascade = false;
        newRules.push(deleteSubtemplateContentSpaces);
      }
    }

    const memberCriterias = await this.roleSetService.getCredentialsForRole(
      roleSet,
      RoleName.MEMBER,
      templateContentSpaceSettings
    );
    const templateContentSpaceMember =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.READ],
        memberCriterias,
        CREDENTIAL_RULE_SPACE_MEMBERS_READ
      );
    newRules.push(templateContentSpaceMember);

    const templateContentSpaceAdminCriterias =
      await this.roleSetService.getCredentialsForRoleWithParents(
        roleSet,
        RoleName.ADMIN,
        templateContentSpaceSettings
      );
    const templateContentSpaceAdmin =
      this.authorizationPolicyService.createCredentialRule(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
          AuthorizationPrivilege.GRANT,
        ],
        templateContentSpaceAdminCriterias,
        CREDENTIAL_RULE_SPACE_ADMINS
      );
    newRules.push(templateContentSpaceAdmin);

    const collaborationSettings = templateContentSpaceSettings.collaboration;
    if (collaborationSettings.allowMembersToCreateSubtemplateContentSpaces) {
      const criteria = await this.getContributorCriteria(
        roleSet,
        templateContentSpaceSettings
      );
      const createSubtemplateContentSpacePrivilegeRule =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.CREATE_SUBSPACE],
          criteria,
          CREDENTIAL_RULE_MEMBER_CREATE_SUBSPACE
        );
      createSubtemplateContentSpacePrivilegeRule.cascade = false;
      newRules.push(createSubtemplateContentSpacePrivilegeRule);
    }

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
  }

  private async getContributorCriteria(
    roleSet: IRoleSet,
    templateContentSpaceSettings: ITemplateContentSpaceSettings
  ): Promise<ICredentialDefinition[]> {
    const memberCriteria = await this.roleSetService.getCredentialsForRole(
      roleSet,
      RoleName.MEMBER,
      templateContentSpaceSettings
    );
    const collaborationSettings = templateContentSpaceSettings.collaboration;
    if (
      collaborationSettings.inheritMembershipRights &&
      templateContentSpaceSettings.privacy.mode ===
        TemplateContentSpacePrivacyMode.PUBLIC
    ) {
      const parentCredential =
        await this.roleSetService.getDirectParentCredentialForRole(
          roleSet,
          RoleName.MEMBER
        );
      if (parentCredential) memberCriteria.push(parentCredential);
    }
    return memberCriteria;
  }

  private resetToPrivateLevelZeroTemplateContentSpaceAuthorization(
    templateContentSpace: ITemplateContentSpace,
    authorizationPolicy: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    let updatedAuthorization =
      this.authorizationPolicyService.reset(authorizationPolicy);
    updatedAuthorization =
      this.platformAuthorizationService.inheritRootAuthorizationPolicy(
        updatedAuthorization
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // Allow global admins to manage platform settings
    // Later: to allow account admins to some settings?
    const templateContentSpacePlatformSettingsAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.PLATFORM_ADMIN],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        CREDENTIAL_RULE_TYPES_SPACE_PLATFORM_SETTINGS
      );
    templateContentSpacePlatformSettingsAdmin.cascade = false;
    newRules.push(templateContentSpacePlatformSettingsAdmin);

    // in order for Global roles to be able to administer the templateContentSpaces
    const globalRolesReadAbout =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.READ_ABOUT],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
          AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
        ],
        CREDENTIAL_RULE_TYPES_SPACE_PLATFORM_SETTINGS
      );
    globalRolesReadAbout.cascade = false;
    newRules.push(globalRolesReadAbout);

    // Allow Global TemplateContentSpaces Read to view TemplateContentSpaces
    const globalTemplateContentSpacesReader =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.READ],
        [AuthorizationCredential.GLOBAL_SPACES_READER],
        CREDENTIAL_RULE_TYPES_GLOBAL_SPACE_READ
      );
    newRules.push(globalTemplateContentSpacesReader);

    //
    if (templateContentSpace.level === TemplateContentSpaceLevel.L0) {
      // Additional rules so that global roles can see the license information.
      const globalRolesReadAccessLicense =
        this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
          [AuthorizationPrivilege.READ_LICENSE],
          [
            AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
            AuthorizationCredential.GLOBAL_SUPPORT,
          ],
          'Read access to License for global roles'
        );
      globalRolesReadAccessLicense.cascade = false;
      newRules.push(globalRolesReadAccessLicense);

      const accountAdminCredential =
        this.getAccountAdminCredentialForTemplateContentSpaceL0OrFail(
          templateContentSpace
        );
      const accountAdminReadAboutLicense =
        this.authorizationPolicyService.createCredentialRule(
          [
            AuthorizationPrivilege.READ_LICENSE,
            AuthorizationPrivilege.READ_ABOUT,
          ],
          [accountAdminCredential],
          'Read about and license access to License for account admins'
        );
      accountAdminReadAboutLicense.cascade = false;
      newRules.push(accountAdminReadAboutLicense);
    }

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      updatedAuthorization,
      newRules
    );
  }
}
