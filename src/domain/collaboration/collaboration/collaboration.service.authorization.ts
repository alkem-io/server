import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { LogContext } from '@common/enums/logging.context';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { CalloutAuthorizationService } from '@domain/collaboration/callout/callout.service.authorization';
import { AuthorizationCredential } from '@common/enums';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { CommunityPolicyService } from '@domain/community/community-policy/community.policy.service';
import { CommunityPolicyFlag } from '@common/enums/community.policy.flag';
import {
  CREDENTIAL_RULE_TYPES_COLLABORATION_CREATE_RELATION_REGISTERED,
  CREDENTIAL_RULE_COLLABORATION_CONTRIBUTORS,
  POLICY_RULE_COLLABORATION_CREATE,
  POLICY_RULE_CALLOUT_CONTRIBUTE,
  POLICY_RULE_COLLABORATION_WHITEBOARD_CREATE,
  CREDENTIAL_RULE_TYPES_CALLOUT_SAVE_AS_TEMPLATE,
  POLICY_RULE_COLLABORATION_WHITEBOARD_CONTRIBUTORS_CREATE,
} from '@common/constants';
import { CommunityRole } from '@common/enums/community.role';
import { TimelineAuthorizationService } from '@domain/timeline/timeline/timeline.service.authorization';
import { ICallout } from '../callout/callout.interface';
import { ILicense } from '@domain/license/license/license.interface';
import { LicenseService } from '@domain/license/license/license.service';
import { LicenseFeatureFlagName } from '@common/enums/license.feature.flag.name';
import { InnovationFlowAuthorizationService } from '../innovation-flow/innovation.flow.service.authorization';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';

@Injectable()
export class CollaborationAuthorizationService {
  constructor(
    private collaborationService: CollaborationService,
    private communityPolicyService: CommunityPolicyService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private timelineAuthorizationService: TimelineAuthorizationService,
    private licenseService: LicenseService,
    private calloutAuthorizationService: CalloutAuthorizationService,
    private innovationFlowAuthorizationService: InnovationFlowAuthorizationService,
    @InjectRepository(Collaboration)
    private collaborationRepository: Repository<Collaboration>
  ) {}

  public async applyAuthorizationPolicy(
    collaboration: ICollaboration,
    parentAuthorization: IAuthorizationPolicy | undefined,
    communityPolicy: ICommunityPolicy,
    license: ILicense
  ): Promise<ICollaboration> {
    collaboration.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        collaboration.authorization,
        parentAuthorization
      );

    collaboration.authorization = await this.appendCredentialRules(
      collaboration.authorization,
      communityPolicy,
      license
    );
    collaboration.authorization = this.appendCredentialRulesForContributors(
      collaboration.authorization,
      communityPolicy
    );

    collaboration.authorization = await this.appendPrivilegeRules(
      collaboration.authorization,
      communityPolicy,
      license
    );
    await this.collaborationRepository.save(collaboration);
    return await this.propagateAuthorizationToChildEntities(
      collaboration,
      communityPolicy
    );
  }

  public async propagateAuthorizationToChildEntities(
    collaborationInput: ICollaboration,
    communityPolicy: ICommunityPolicy
  ): Promise<ICollaboration> {
    const collaboration =
      await this.collaborationService.getCollaborationOrFail(
        collaborationInput.id,
        {
          relations: {
            callouts: true,
            innovationFlow: true,
            timeline: true,
            relations: true,
          },
        }
      );
    if (
      !collaboration.callouts ||
      !collaboration.innovationFlow ||
      !collaboration.timeline ||
      !collaboration.relations
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load child entities for collaboration authorization:  ${collaboration.id}`,
        LogContext.CHALLENGES
      );
    }

    const updatedCallouts: ICallout[] = [];
    for (const callout of collaboration.callouts) {
      const updatedCallout =
        await this.calloutAuthorizationService.applyAuthorizationPolicy(
          callout,
          collaboration.authorization,
          communityPolicy
        );
      updatedCallouts.push(updatedCallout);
    }
    collaboration.callouts = updatedCallouts;

    // Extend with contributor rules + then send into apply
    const clonedAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        collaboration.authorization
      );

    const extendedAuthorizationContributors =
      this.appendCredentialRulesForContributors(
        clonedAuthorization,
        communityPolicy
      );

    collaboration.timeline =
      await this.timelineAuthorizationService.applyAuthorizationPolicy(
        collaboration.timeline,
        extendedAuthorizationContributors
      );

    for (const relation of collaboration.relations) {
      relation.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          relation.authorization,
          collaboration.authorization
        );
    }

    collaboration.innovationFlow =
      await this.innovationFlowAuthorizationService.applyAuthorizationPolicy(
        collaboration.innovationFlow,
        collaboration.authorization
      );

    return await this.collaborationService.save(collaboration);
  }

  private getContributorCredentials(
    policy: ICommunityPolicy
  ): ICredentialDefinition[] {
    // add challenge members
    const contributors = [
      this.communityPolicyService.getCredentialForRole(
        policy,
        CommunityRole.MEMBER
      ),
    ];
    // optionally add space members
    if (
      this.communityPolicyService.getFlag(
        policy,
        CommunityPolicyFlag.ALLOW_SPACE_MEMBERS_TO_CONTRIBUTE
      )
    ) {
      const parentCredentials =
        this.communityPolicyService.getParentCredentialsForRole(
          policy,
          CommunityRole.MEMBER
        );
      contributors.push(...parentCredentials);
    }

    contributors.push({
      type: AuthorizationCredential.GLOBAL_ADMIN,
      resourceID: '',
    });
    contributors.push({
      type: AuthorizationCredential.GLOBAL_ADMIN_SPACES,
      resourceID: '',
    });
    return contributors;
  }

  private async appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined,
    policy: ICommunityPolicy,
    license: ILicense
  ): Promise<IAuthorizationPolicy> {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for Context: ${JSON.stringify(
          policy
        )}`,
        LogContext.COLLABORATION
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const communityMemberNotInherited =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.CREATE_RELATION],
        [AuthorizationCredential.USER_SELF_MANAGEMENT],
        CREDENTIAL_RULE_TYPES_COLLABORATION_CREATE_RELATION_REGISTERED
      );
    communityMemberNotInherited.cascade = false;
    newRules.push(communityMemberNotInherited);

    const saveAsTemplateEnabled =
      await this.licenseService.isFeatureFlagEnabled(
        license,
        LicenseFeatureFlagName.CALLOUT_TO_CALLOUT_TEMPLATE
      );
    if (saveAsTemplateEnabled) {
      const saveAsTemplate =
        this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
          [AuthorizationPrivilege.SAVE_AS_TEMPLATE],
          [
            AuthorizationCredential.GLOBAL_ADMIN,
            AuthorizationCredential.GLOBAL_ADMIN_SPACES,
          ],
          CREDENTIAL_RULE_TYPES_CALLOUT_SAVE_AS_TEMPLATE
        );
      saveAsTemplate.cascade = false;
      newRules.push(saveAsTemplate);
    }

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );
  }

  public appendCredentialRulesForContributors(
    authorization: IAuthorizationPolicy | undefined,
    policy: ICommunityPolicy
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
    const contributors = this.getContributorCredentials(policy);
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
    policy: ICommunityPolicy,
    license: ILicense
  ): Promise<IAuthorizationPolicy> {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    const createPrivilege = new AuthorizationPolicyRulePrivilege(
      [
        AuthorizationPrivilege.CREATE_CALLOUT,
        AuthorizationPrivilege.CREATE_RELATION,
      ],
      AuthorizationPrivilege.CREATE,
      POLICY_RULE_COLLABORATION_CREATE
    );
    privilegeRules.push(createPrivilege);

    const whiteboardRtEnabled = await this.licenseService.isFeatureFlagEnabled(
      license,
      LicenseFeatureFlagName.WHITEBOARD_MULTI_USER
    );
    if (whiteboardRtEnabled) {
      const createWhiteboardRtPrivilege = new AuthorizationPolicyRulePrivilege(
        [AuthorizationPrivilege.CREATE_WHITEBOARD_RT], // todo
        AuthorizationPrivilege.CREATE,
        POLICY_RULE_COLLABORATION_WHITEBOARD_CREATE
      );
      privilegeRules.push(createWhiteboardRtPrivilege);
    }

    if (
      this.communityPolicyService.getFlag(
        policy,
        CommunityPolicyFlag.ALLOW_CONTRIBUTORS_TO_CREATE_CALLOUTS
      )
    ) {
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
