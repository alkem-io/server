import { Injectable } from '@nestjs/common';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { LogContext } from '@common/enums/logging.context';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { CalloutAuthorizationService } from '@domain/collaboration/callout/callout.service.authorization';
import { AuthorizationCredential } from '@common/enums';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import {
  CREDENTIAL_RULE_COLLABORATION_CONTRIBUTORS,
  POLICY_RULE_COLLABORATION_CREATE,
  POLICY_RULE_CALLOUT_CONTRIBUTE,
  CREDENTIAL_RULE_TYPES_CALLOUT_SAVE_AS_TEMPLATE,
  POLICY_RULE_COLLABORATION_WHITEBOARD_CONTRIBUTORS_CREATE,
} from '@common/constants';
import { CommunityRoleType } from '@common/enums/community.role';
import { TimelineAuthorizationService } from '@domain/timeline/timeline/timeline.service.authorization';
import { InnovationFlowAuthorizationService } from '../innovation-flow/innovation.flow.service.authorization';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import { IRoleSet } from '@domain/access/role-set';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { LicenseAuthorizationService } from '@domain/common/license/license.service.authorization';

@Injectable()
export class CollaborationAuthorizationService {
  constructor(
    private collaborationService: CollaborationService,
    private roleSetService: RoleSetService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private timelineAuthorizationService: TimelineAuthorizationService,
    private calloutAuthorizationService: CalloutAuthorizationService,
    private innovationFlowAuthorizationService: InnovationFlowAuthorizationService,
    private licenseAuthorizationService: LicenseAuthorizationService
  ) {}

  public async applyAuthorizationPolicy(
    collaborationInput: ICollaboration,
    parentAuthorization: IAuthorizationPolicy,
    roleSet?: IRoleSet,
    spaceSettings?: ISpaceSettings
  ): Promise<IAuthorizationPolicy[]> {
    const collaboration =
      await this.collaborationService.getCollaborationOrFail(
        collaborationInput.id,
        {
          relations: {
            callouts: true,
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
    if (!collaboration.callouts || !collaboration.innovationFlow) {
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
      roleSet,
      spaceSettings
    );
    if (roleSet && spaceSettings) {
      collaboration.authorization =
        await this.appendCredentialRulesForContributors(
          collaboration.authorization,
          roleSet,
          spaceSettings
        );

      collaboration.authorization = await this.appendPrivilegeRules(
        collaboration.authorization,
        spaceSettings
      );
    }
    updatedAuthorizations.push(collaboration.authorization);

    const childUpdatedAuthorizations =
      await this.propagateAuthorizationToChildEntities(
        collaboration,
        roleSet,
        spaceSettings
      );
    updatedAuthorizations.push(...childUpdatedAuthorizations);

    return updatedAuthorizations;
  }

  private async propagateAuthorizationToChildEntities(
    collaboration: ICollaboration,
    roleSet?: IRoleSet,
    spaceSettings?: ISpaceSettings
  ): Promise<IAuthorizationPolicy[]> {
    if (
      !collaboration.callouts ||
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

    for (const callout of collaboration.callouts) {
      const updatedCalloutAuthorizations =
        await this.calloutAuthorizationService.applyAuthorizationPolicy(
          callout.id,
          collaboration.authorization,
          roleSet,
          spaceSettings
        );
      updatedAuthorizations.push(...updatedCalloutAuthorizations);
    }

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
          spaceSettings
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
        collaboration.innovationFlow,
        collaboration.authorization
      );
    updatedAuthorizations.push(...flowAuthorizations);

    return updatedAuthorizations;
  }

  private async getContributorCredentials(
    roleSet: IRoleSet,
    spaceSettings: ISpaceSettings
  ): Promise<ICredentialDefinition[]> {
    // add challenge members
    let contributorCriterias = await this.roleSetService.getCredentialsForRole(
      roleSet,
      CommunityRoleType.MEMBER,
      spaceSettings
    );
    // optionally add space members
    if (spaceSettings.collaboration.inheritMembershipRights) {
      contributorCriterias =
        await this.roleSetService.getCredentialsForRoleWithParents(
          roleSet,
          CommunityRoleType.MEMBER,
          spaceSettings
        );
    }

    contributorCriterias.push({
      type: AuthorizationCredential.GLOBAL_ADMIN,
      resourceID: '',
    });
    return contributorCriterias;
  }

  private async appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined,
    roleSet?: IRoleSet,
    spaceSettings?: ISpaceSettings,
    spaceAgent?: IAgent
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
    if (!roleSet || !spaceSettings || !spaceAgent) {
      return authorization;
    }

    const adminCriterias = await this.roleSetService.getCredentialsForRole(
      roleSet,
      CommunityRoleType.ADMIN,
      spaceSettings
    );
    adminCriterias.push({
      type: AuthorizationCredential.GLOBAL_ADMIN,
      resourceID: '',
    });
    const saveAsTemplateRule =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.SAVE_AS_TEMPLATE],
        adminCriterias,
        CREDENTIAL_RULE_TYPES_CALLOUT_SAVE_AS_TEMPLATE
      );

    saveAsTemplateRule.cascade = false;
    newRules.push(saveAsTemplateRule);

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );
  }

  public async appendCredentialRulesForContributors(
    authorization: IAuthorizationPolicy | undefined,
    policy: IRoleSet,
    spaceSettings: ISpaceSettings
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
      spaceSettings
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

  private async appendPrivilegeRules(
    authorization: IAuthorizationPolicy,
    spaceSettings: ISpaceSettings
  ): Promise<IAuthorizationPolicy> {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    const createPrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.CREATE_CALLOUT],
      AuthorizationPrivilege.CREATE,
      POLICY_RULE_COLLABORATION_CREATE
    );
    privilegeRules.push(createPrivilege);

    const collaborationSettings = spaceSettings.collaboration;
    if (collaborationSettings.allowMembersToCreateCallouts) {
      const createCalloutPrivilege = new AuthorizationPolicyRulePrivilege(
        [AuthorizationPrivilege.CREATE_CALLOUT],
        AuthorizationPrivilege.CONTRIBUTE,
        POLICY_RULE_CALLOUT_CONTRIBUTE
      );
      privilegeRules.push(createCalloutPrivilege);

      const createWhiteboardRtContributePrivilege =
        new AuthorizationPolicyRulePrivilege(
          [AuthorizationPrivilege.CREATE_WHITEBOARD_RT],
          AuthorizationPrivilege.CONTRIBUTE,
          POLICY_RULE_COLLABORATION_WHITEBOARD_CONTRIBUTORS_CREATE
        );
      privilegeRules.push(createWhiteboardRtContributePrivilege);
    }

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }
}
