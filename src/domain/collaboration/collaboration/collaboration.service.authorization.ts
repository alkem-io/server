import { CREDENTIAL_RULE_COLLABORATION_CONTRIBUTORS } from '@common/constants';
import { AuthorizationCredential } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { RoleName } from '@common/enums/role.name';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { IPlatformRolesAccess } from '@domain/access/platform-roles-access/platform.roles.access.interface';
import { PlatformRolesAccessService } from '@domain/access/platform-roles-access/platform.roles.access.service';
import { IRoleSet } from '@domain/access/role-set';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { InheritedCredentialRuleSetService } from '@domain/common/inherited-credential-rule-set/inherited.credential.rule.set.service';
import { LicenseAuthorizationService } from '@domain/common/license/license.service.authorization';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import { TimelineAuthorizationService } from '@domain/timeline/timeline/timeline.service.authorization';
import { Injectable } from '@nestjs/common';
import { CalloutsSetAuthorizationService } from '../callouts-set/callouts.set.service.authorization';
import { InnovationFlowAuthorizationService } from '../innovation-flow/innovation.flow.service.authorization';

@Injectable()
export class CollaborationAuthorizationService {
  constructor(
    private collaborationService: CollaborationService,
    private roleSetService: RoleSetService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private timelineAuthorizationService: TimelineAuthorizationService,
    private calloutsSetAuthorizationService: CalloutsSetAuthorizationService,
    private innovationFlowAuthorizationService: InnovationFlowAuthorizationService,
    private licenseAuthorizationService: LicenseAuthorizationService,
    private platformRolesAccessService: PlatformRolesAccessService,
    private inheritedCredentialRuleSetService: InheritedCredentialRuleSetService
  ) {}

  public async applyAuthorizationPolicy(
    collaborationInput: ICollaboration,
    parentAuthorization: IAuthorizationPolicy,
    platformRolesAccess: IPlatformRolesAccess,
    roleSet?: IRoleSet,
    spaceSettings?: ISpaceSettings,
    credentialRulesFromParent: IAuthorizationPolicyRuleCredential[] = []
  ): Promise<IAuthorizationPolicy[]> {
    const collaboration =
      await this.collaborationService.getCollaborationOrFail(
        collaborationInput.id,
        {
          relations: {
            calloutsSet: true,
            innovationFlow: {
              profile: true,
            },
            timeline: true,
            license: {
              entitlements: true,
            },
          },
        }
      );
    if (!collaboration.calloutsSet || !collaboration.innovationFlow) {
      throw new RelationshipNotFoundException(
        `Unable to load child entities for collaboration authorization:  ${collaboration.id}`,
        LogContext.SPACES
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    collaboration.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        collaboration.authorization,
        parentAuthorization
      );

    collaboration.authorization = await this.appendCredentialRules(
      collaboration.authorization,
      platformRolesAccess,
      roleSet
    );
    if (roleSet && spaceSettings) {
      collaboration.authorization =
        await this.appendCredentialRulesForContributors(
          collaboration.authorization,
          roleSet,
          spaceSettings,
          platformRolesAccess
        );
    }
    collaboration.authorization.credentialRules.push(
      ...credentialRulesFromParent
    );
    updatedAuthorizations.push(collaboration.authorization);

    await this.inheritedCredentialRuleSetService.resolveForParent(
      collaboration.authorization
    );

    const childUpdatedAuthorizations =
      await this.propagateAuthorizationToChildEntities(
        collaboration,
        platformRolesAccess,
        roleSet,
        spaceSettings
      );
    updatedAuthorizations.push(...childUpdatedAuthorizations);

    return updatedAuthorizations;
  }

  private async propagateAuthorizationToChildEntities(
    collaboration: ICollaboration,
    platformRolesAccess: IPlatformRolesAccess,
    roleSet?: IRoleSet,
    spaceSettings?: ISpaceSettings
  ): Promise<IAuthorizationPolicy[]> {
    if (
      !collaboration.calloutsSet ||
      !collaboration.innovationFlow ||
      !collaboration.innovationFlow.profile ||
      !collaboration.license ||
      !collaboration.license.entitlements
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load child entities for collaboration authorization children:  ${collaboration.id}`,
        LogContext.SPACES
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    const updatedCalloutsSetAuthorizations =
      await this.calloutsSetAuthorizationService.applyAuthorizationPolicy(
        collaboration.calloutsSet,
        collaboration.authorization,
        platformRolesAccess,
        [],
        roleSet,
        spaceSettings
      );

    updatedAuthorizations.push(...updatedCalloutsSetAuthorizations);

    const licenseAuthorization =
      this.licenseAuthorizationService.applyAuthorizationPolicy(
        collaboration.license,
        collaboration.authorization
      );
    updatedAuthorizations.push(...licenseAuthorization);

    // Extend with contributor rules + then send into apply
    const clonedAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        collaboration.authorization
      );

    // Collaboration templates don't have timeline so this won't be executed for them
    if (roleSet && spaceSettings && collaboration.timeline) {
      const extendedAuthorizationContributors =
        await this.appendCredentialRulesForContributors(
          clonedAuthorization,
          roleSet,
          spaceSettings,
          platformRolesAccess
        );
      const timelineAuthorizations =
        await this.timelineAuthorizationService.applyAuthorizationPolicy(
          collaboration.timeline,
          extendedAuthorizationContributors
        );
      updatedAuthorizations.push(...timelineAuthorizations);
    }

    const flowAuthorizations =
      await this.innovationFlowAuthorizationService.applyAuthorizationPolicy(
        collaboration.innovationFlow.id,
        collaboration.authorization
      );
    updatedAuthorizations.push(...flowAuthorizations);

    return updatedAuthorizations;
  }

  private async getContributorCredentials(
    roleSet: IRoleSet,
    spaceSettings: ISpaceSettings,
    platformRolesAccess: IPlatformRolesAccess
  ): Promise<ICredentialDefinition[]> {
    // add challenge members
    let contributorCriterias = await this.roleSetService.getCredentialsForRole(
      roleSet,
      RoleName.MEMBER
    );
    // optionally add space members
    if (spaceSettings.collaboration.inheritMembershipRights) {
      contributorCriterias =
        await this.roleSetService.getCredentialsForRoleWithParents(
          roleSet,
          RoleName.MEMBER
        );
    }

    contributorCriterias.push({
      type: AuthorizationCredential.GLOBAL_ADMIN,
      resourceID: '',
    });

    // Add platform roles that have UPDATE access (including GLOBAL_SUPPORT if allowPlatformSupportAsAdmin is set)
    const platformRolesContributorCriterias =
      this.platformRolesAccessService.getCredentialsForRolesWithAccess(
        platformRolesAccess.roles,
        [AuthorizationPrivilege.UPDATE]
      );
    contributorCriterias.push(...platformRolesContributorCriterias);

    return contributorCriterias;
  }

  private async appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined,
    platformRolesAccess: IPlatformRolesAccess,
    roleSet?: IRoleSet
  ): Promise<IAuthorizationPolicy> {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for Context: ${JSON.stringify(
          roleSet
        )}`,
        LogContext.COLLABORATION
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // For templates these will not be available
    if (!roleSet) {
      return authorization;
    }

    const adminCriterias = await this.roleSetService.getCredentialsForRole(
      roleSet,
      RoleName.ADMIN
    );
    const platformRolesAdminCriterias =
      this.platformRolesAccessService.getCredentialsForRolesWithAccess(
        platformRolesAccess.roles,
        [AuthorizationPrivilege.UPDATE]
      );
    adminCriterias.push(...platformRolesAdminCriterias);
    adminCriterias.push({
      type: AuthorizationCredential.GLOBAL_ADMIN,
      resourceID: '',
    });
    if (adminCriterias.length > 0) {
      const adminsRule = this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.UPDATE],
        adminCriterias,
        CREDENTIAL_RULE_COLLABORATION_CONTRIBUTORS
      );
      adminsRule.cascade = true;
      newRules.push(adminsRule);
    }

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );
  }

  public async appendCredentialRulesForContributors(
    authorization: IAuthorizationPolicy | undefined,
    policy: IRoleSet,
    spaceSettings: ISpaceSettings,
    platformRolesAccess: IPlatformRolesAccess
  ): Promise<IAuthorizationPolicy> {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for Context: ${JSON.stringify(
          policy
        )}`,
        LogContext.COLLABORATION
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // Who is able to contribute
    const contributors = await this.getContributorCredentials(
      policy,
      spaceSettings,
      platformRolesAccess
    );
    const contributorsRule =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.CONTRIBUTE],
        contributors,
        CREDENTIAL_RULE_COLLABORATION_CONTRIBUTORS
      );
    newRules.push(contributorsRule);

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );
  }
}
