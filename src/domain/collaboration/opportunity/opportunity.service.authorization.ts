import { Injectable } from '@nestjs/common';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { IOpportunity } from './opportunity.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { LogContext } from '@common/enums/logging.context';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { OpportunityService } from './opportunity.service';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { CommunityPolicyService } from '@domain/community/community-policy/community.policy.service';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { CommunityPolicyFlag } from '@common/enums/community.policy.flag';
import {
  CREDENTIAL_RULE_COMMUNITY_ADD_MEMBER,
  CREDENTIAL_RULE_OPPORTUNITY_ADMIN,
  CREDENTIAL_RULE_OPPORTUNITY_MEMBER,
} from '@common/constants';
import { InnovationFlowAuthorizationService } from '@domain/challenge/innovation-flow/innovation.flow.service.authorization';
import { CommunityRole } from '@common/enums/community.role';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { ContextAuthorizationService } from '@domain/context/context/context.service.authorization';
import { CommunityAuthorizationService } from '@domain/community/community/community.service.authorization';
import { CollaborationAuthorizationService } from '../collaboration/collaboration.service.authorization';

@Injectable()
export class OpportunityAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private opportunityService: OpportunityService,
    private communityPolicyService: CommunityPolicyService,
    private innovationFlowAuthorizationService: InnovationFlowAuthorizationService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private contextAuthorizationService: ContextAuthorizationService,
    private communityAuthorizationService: CommunityAuthorizationService,
    private collaborationAuthorizationService: CollaborationAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    opportunity: IOpportunity,
    challengeAuthorization: IAuthorizationPolicy | undefined,
    challengeCommunityPolicy: ICommunityPolicy
  ): Promise<IOpportunity> {
    const communityPolicy = await this.opportunityService.getCommunityPolicy(
      opportunity.id
    );

    this.setCommunityPolicyFlags(communityPolicy, challengeCommunityPolicy);

    // Start with parent authorization
    opportunity.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        opportunity.authorization,
        challengeAuthorization
      );
    // Add in opportunity specified policy rules
    opportunity.authorization = this.appendCredentialRules(
      opportunity.authorization,
      communityPolicy
    );

    // propagate authorization rules for child entities
    return await this.propagateAuthorizationToChildEntities(
      opportunity,
      communityPolicy
    );
  }

  private setCommunityPolicyFlags(
    policy: ICommunityPolicy,
    challengeCommunityPolicy: ICommunityPolicy
  ) {
    // propagate the value of the parent community policy into the opportunity community policy
    const challengeContributors = this.communityPolicyService.getFlag(
      challengeCommunityPolicy,
      CommunityPolicyFlag.ALLOW_SPACE_MEMBERS_TO_CONTRIBUTE
    );
    this.communityPolicyService.setFlag(
      policy,
      CommunityPolicyFlag.ALLOW_SPACE_MEMBERS_TO_CONTRIBUTE,
      challengeContributors
    );

    // Propagate the callout flag from challenge community policy also
    const challengeCalloutCreation = this.communityPolicyService.getFlag(
      challengeCommunityPolicy,
      CommunityPolicyFlag.ALLOW_CONTRIBUTORS_TO_CREATE_CALLOUTS
    );
    this.communityPolicyService.setFlag(
      policy,
      CommunityPolicyFlag.ALLOW_CONTRIBUTORS_TO_CREATE_CALLOUTS,
      challengeCalloutCreation
    );
  }

  private appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined,
    policy: ICommunityPolicy
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${policy}`,
        LogContext.OPPORTUNITY
      );

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      this.createCredentialRules(policy)
    );
  }

  private extendCommunityAuthorizationPolicy(
    authorization: IAuthorizationPolicy | undefined,
    policy: ICommunityPolicy
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        'Authorization definition not found',
        LogContext.CHALLENGES
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];
    const adminCredentials =
      this.communityPolicyService.getAllCredentialsForRole(
        policy,
        CommunityRole.ADMIN
      );

    const addMembers = this.authorizationPolicyService.createCredentialRule(
      [AuthorizationPrivilege.COMMUNITY_ADD_MEMBER],
      adminCredentials,
      CREDENTIAL_RULE_COMMUNITY_ADD_MEMBER
    );
    addMembers.cascade = false;
    newRules.push(addMembers);

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
  }

  private createCredentialRules(
    policy: ICommunityPolicy
  ): IAuthorizationPolicyRuleCredential[] {
    const rules: IAuthorizationPolicyRuleCredential[] = [];

    const opportunityAdmin =
      this.authorizationPolicyService.createCredentialRule(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.GRANT,
          AuthorizationPrivilege.DELETE,
        ],
        [
          this.communityPolicyService.getCredentialForRole(
            policy,
            CommunityRole.ADMIN
          ),
        ],
        CREDENTIAL_RULE_OPPORTUNITY_ADMIN
      );
    rules.push(opportunityAdmin);

    const opportunityMember =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.READ],
        [
          this.communityPolicyService.getCredentialForRole(
            policy,
            CommunityRole.MEMBER
          ),
        ],
        CREDENTIAL_RULE_OPPORTUNITY_MEMBER
      );
    rules.push(opportunityMember);

    return rules;
  }
  private async propagateAuthorizationToChildEntities(
    opportunityBase: IOpportunity,
    policy: ICommunityPolicy
  ): Promise<IOpportunity> {
    await this.opportunityService.save(opportunityBase);

    let opportunity =
      await this.propagateAuthorizationToCommunityCollaborationAgent(
        opportunityBase,
        policy
      );
    opportunity = await this.propagateAuthorizationToProfileContext(
      opportunity
    );
    return await this.propagateAuthorizationToProjectsInnovationFlow(
      opportunity
    );
  }

  private async propagateAuthorizationToProfileContext(
    challengeBase: IOpportunity
  ): Promise<IOpportunity> {
    const challenge = await this.opportunityService.getOpportunityOrFail(
      challengeBase.id,
      {
        relations: {
          context: true,
          profile: true,
        },
      }
    );
    if (!challenge.context || !challenge.profile)
      throw new RelationshipNotFoundException(
        `Unable to load context or profile for opportunity ${challenge.id} `,
        LogContext.CONTEXT
      );
    // Clone the authorization policy
    const clonedAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        challenge.authorization
      );
    // To ensure that profile + context on a space are always publicly visible, even for private challenges
    clonedAuthorization.anonymousReadAccess = true;

    challenge.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        challenge.profile,
        clonedAuthorization
      );

    challenge.context =
      await this.contextAuthorizationService.applyAuthorizationPolicy(
        challenge.context,
        clonedAuthorization
      );
    return challenge;
  }

  public async propagateAuthorizationToCommunityCollaborationAgent(
    opportunityBase: IOpportunity,
    communityPolicy: ICommunityPolicy
  ): Promise<IOpportunity> {
    const opportunity = await this.opportunityService.getOpportunityOrFail(
      opportunityBase.id,
      {
        relations: {
          community: true,
          collaboration: true,
          agent: true,
        },
      }
    );
    if (
      !opportunity.community ||
      !opportunity.collaboration ||
      !opportunity.agent
    )
      throw new RelationshipNotFoundException(
        `Unable to load community or collaboration or agent for opportunity: ${opportunity.id} `,
        LogContext.CHALLENGES
      );

    opportunity.community =
      await this.communityAuthorizationService.applyAuthorizationPolicy(
        opportunity.community,
        opportunity.authorization
      );
    // Specific extension
    opportunity.community.authorization =
      this.extendCommunityAuthorizationPolicy(
        opportunity.community.authorization,
        communityPolicy
      );

    opportunity.collaboration =
      await this.collaborationAuthorizationService.applyAuthorizationPolicy(
        opportunity.collaboration,
        opportunity.authorization,
        communityPolicy
      );

    opportunity.agent.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        opportunity.agent.authorization,
        opportunity.authorization
      );
    return await this.opportunityService.save(opportunity);
  }

  public async propagateAuthorizationToProjectsInnovationFlow(
    opportunityBase: IOpportunity
  ): Promise<IOpportunity> {
    const opportunity = await this.opportunityService.getOpportunityOrFail(
      opportunityBase.id,
      {
        relations: {
          innovationFlow: true,
          projects: true,
        },
      }
    );
    if (!opportunity.innovationFlow || !opportunity.projects)
      throw new RelationshipNotFoundException(
        `Unable to load child entities for opportunity: ${opportunity.id} `,
        LogContext.CHALLENGES
      );

    for (const project of opportunity.projects) {
      project.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          project.authorization,
          opportunity.authorization
        );
    }

    opportunity.innovationFlow =
      await this.innovationFlowAuthorizationService.applyAuthorizationPolicy(
        opportunity.innovationFlow,
        opportunity.authorization
      );

    return await this.opportunityService.save(opportunity);
  }
}
