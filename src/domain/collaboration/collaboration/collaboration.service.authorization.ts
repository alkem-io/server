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
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { CommunityPolicyService } from '@domain/community/community-policy/community.policy.service';
import {
  CREDENTIAL_RULE_COLLABORATION_CONTRIBUTORS,
  POLICY_RULE_COLLABORATION_CREATE,
  POLICY_RULE_CALLOUT_CONTRIBUTE,
  POLICY_RULE_COLLABORATION_WHITEBOARD_CREATE,
  CREDENTIAL_RULE_TYPES_CALLOUT_SAVE_AS_TEMPLATE,
  POLICY_RULE_COLLABORATION_WHITEBOARD_CONTRIBUTORS_CREATE,
} from '@common/constants';
import { CommunityRole } from '@common/enums/community.role';
import { TimelineAuthorizationService } from '@domain/timeline/timeline/timeline.service.authorization';
import { InnovationFlowAuthorizationService } from '../innovation-flow/innovation.flow.service.authorization';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { LicenseEngineService } from '@core/license-engine/license.engine.service';
import { LicensePrivilege } from '@common/enums/license.privilege';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';

@Injectable()
export class CollaborationAuthorizationService {
  constructor(
    private licenseEngineService: LicenseEngineService,
    private collaborationService: CollaborationService,
    private communityPolicyService: CommunityPolicyService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private timelineAuthorizationService: TimelineAuthorizationService,
    private calloutAuthorizationService: CalloutAuthorizationService,
    private innovationFlowAuthorizationService: InnovationFlowAuthorizationService
  ) {}

  public async applyAuthorizationPolicy(
    collaborationInput: ICollaboration,
    parentAuthorization: IAuthorizationPolicy | undefined,
    communityPolicy: ICommunityPolicy,
    spaceSettings: ISpaceSettings,
    accountAgent: IAgent
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
          },
        }
      );
    if (
      !collaboration.callouts ||
      !collaboration.innovationFlow ||
      !collaboration.timeline
    ) {
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
      communityPolicy,
      spaceSettings,
      accountAgent
    );
    collaboration.authorization = this.appendCredentialRulesForContributors(
      collaboration.authorization,
      communityPolicy,
      spaceSettings
    );

    collaboration.authorization = await this.appendPrivilegeRules(
      collaboration.authorization,
      spaceSettings,
      accountAgent
    );
    updatedAuthorizations.push(collaboration.authorization);

    const childUpdatedAuthorizations =
      await this.propagateAuthorizationToChildEntities(
        collaboration,
        communityPolicy,
        spaceSettings
      );
    updatedAuthorizations.push(...childUpdatedAuthorizations);
    return updatedAuthorizations;
  }

  private async propagateAuthorizationToChildEntities(
    collaboration: ICollaboration,
    communityPolicy: ICommunityPolicy,
    spaceSettings: ISpaceSettings
  ): Promise<IAuthorizationPolicy[]> {
    if (
      !collaboration.callouts ||
      !collaboration.innovationFlow ||
      !collaboration.innovationFlow.profile ||
      !collaboration.timeline
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
          callout,
          collaboration.authorization,
          communityPolicy,
          spaceSettings
        );
      updatedAuthorizations.push(...updatedCalloutAuthorizations);
    }

    // Extend with contributor rules + then send into apply
    const clonedAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        collaboration.authorization
      );

    const extendedAuthorizationContributors =
      this.appendCredentialRulesForContributors(
        clonedAuthorization,
        communityPolicy,
        spaceSettings
      );

    const flowAuthorizations =
      await this.innovationFlowAuthorizationService.applyAuthorizationPolicy(
        collaboration.innovationFlow,
        collaboration.authorization
      );
    updatedAuthorizations.push(...flowAuthorizations);

    const timelineAuthorizations =
      await this.timelineAuthorizationService.applyAuthorizationPolicy(
        collaboration.timeline,
        extendedAuthorizationContributors
      );
    updatedAuthorizations.push(...timelineAuthorizations);

    return updatedAuthorizations;
  }

  private getContributorCredentials(
    policy: ICommunityPolicy,
    spaceSettings: ISpaceSettings
  ): ICredentialDefinition[] {
    // add challenge members
    let contributorCriterias =
      this.communityPolicyService.getCredentialsForRole(
        policy,
        spaceSettings,
        CommunityRole.MEMBER
      );
    // optionally add space members
    if (spaceSettings.collaboration.inheritMembershipRights) {
      contributorCriterias =
        this.communityPolicyService.getCredentialsForRoleWithParents(
          policy,
          spaceSettings,
          CommunityRole.MEMBER
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
    policy: ICommunityPolicy,
    spaceSettings: ISpaceSettings,
    accountAgent: IAgent
  ): Promise<IAuthorizationPolicy> {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for Context: ${JSON.stringify(
          policy
        )}`,
        LogContext.COLLABORATION
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const saveAsTemplateEnabled =
      await this.licenseEngineService.isAccessGranted(
        LicensePrivilege.CALLOUT_SAVE_AS_TEMPLATE,
        accountAgent
      );
    if (saveAsTemplateEnabled) {
      const adminCriterias = this.communityPolicyService.getCredentialsForRole(
        policy,
        spaceSettings,
        CommunityRole.ADMIN
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
    }

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );
  }

  public appendCredentialRulesForContributors(
    authorization: IAuthorizationPolicy | undefined,
    policy: ICommunityPolicy,
    spaceSettings: ISpaceSettings
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for Context: ${JSON.stringify(
          policy
        )}`,
        LogContext.COLLABORATION
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // Who is able to contribute
    const contributors = this.getContributorCredentials(policy, spaceSettings);
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
    spaceSettings: ISpaceSettings,
    accountAgent: IAgent
  ): Promise<IAuthorizationPolicy> {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    const createPrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.CREATE_CALLOUT],
      AuthorizationPrivilege.CREATE,
      POLICY_RULE_COLLABORATION_CREATE
    );
    privilegeRules.push(createPrivilege);

    const whiteboardRtEnabled = await this.licenseEngineService.isAccessGranted(
      LicensePrivilege.WHITEBOARD_MULTI_USER,
      accountAgent
    );
    if (whiteboardRtEnabled) {
      const createWhiteboardRtPrivilege = new AuthorizationPolicyRulePrivilege(
        [AuthorizationPrivilege.CREATE_WHITEBOARD_RT], // todo
        AuthorizationPrivilege.CREATE,
        POLICY_RULE_COLLABORATION_WHITEBOARD_CREATE
      );
      privilegeRules.push(createWhiteboardRtPrivilege);
    }
    const collaborationSettings = spaceSettings.collaboration;
    if (collaborationSettings.allowMembersToCreateCallouts) {
      const createCalloutPrivilege = new AuthorizationPolicyRulePrivilege(
        [AuthorizationPrivilege.CREATE_CALLOUT],
        AuthorizationPrivilege.CONTRIBUTE,
        POLICY_RULE_CALLOUT_CONTRIBUTE
      );
      privilegeRules.push(createCalloutPrivilege);

      if (whiteboardRtEnabled) {
        const createWhiteboardRtContributePrivilege =
          new AuthorizationPolicyRulePrivilege(
            [AuthorizationPrivilege.CREATE_WHITEBOARD_RT],
            AuthorizationPrivilege.CONTRIBUTE,
            POLICY_RULE_COLLABORATION_WHITEBOARD_CONTRIBUTORS_CREATE
          );
        privilegeRules.push(createWhiteboardRtContributePrivilege);
      }
    }

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }
}
