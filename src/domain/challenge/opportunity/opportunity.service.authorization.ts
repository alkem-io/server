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
import { CommunityRole } from '@common/enums/community.role';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { ContextAuthorizationService } from '@domain/context/context/context.service.authorization';
import { CommunityAuthorizationService } from '@domain/community/community/community.service.authorization';
import { CollaborationAuthorizationService } from '@domain/collaboration/collaboration/collaboration.service.authorization';
import { StorageAggregatorAuthorizationService } from '@domain/storage/storage-aggregator/storage.aggregator.service.authorization';
import { ILicense } from '@domain/license/license/license.interface';
import { LicenseResolverService } from '@services/infrastructure/license-resolver/license.resolver.service';

@Injectable()
export class OpportunityAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private opportunityService: OpportunityService,
    private communityPolicyService: CommunityPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private contextAuthorizationService: ContextAuthorizationService,
    private communityAuthorizationService: CommunityAuthorizationService,
    private collaborationAuthorizationService: CollaborationAuthorizationService,
    private licenseResolverService: LicenseResolverService,
    private storageAggregatorAuthorizationService: StorageAggregatorAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    opportunity: IOpportunity,
    challengeAuthorization: IAuthorizationPolicy | undefined,
    challengeCommunityPolicy: ICommunityPolicy
  ): Promise<IOpportunity> {
    const license = await this.licenseResolverService.getlicenseForSpace(
      opportunity.spaceID
    );
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
      communityPolicy,
      license
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
    opportunityInput: IOpportunity,
    policy: ICommunityPolicy,
    license: ILicense
  ): Promise<IOpportunity> {
    await this.opportunityService.save(opportunityInput);

    let opportunity =
      await this.propagateAuthorizationToCommunityCollaborationAgent(
        opportunityInput,
        policy,
        license
      );
    opportunity = await this.propagateAuthorizationToProfileContext(
      opportunity
    );
    return await this.propagateAuthorizationToProjectsInnovationFlow(
      opportunity
    );
  }

  private async propagateAuthorizationToProfileContext(
    opportunityBase: IOpportunity
  ): Promise<IOpportunity> {
    const opportunity = await this.opportunityService.getOpportunityOrFail(
      opportunityBase.id,
      {
        relations: {
          context: true,
          profile: true,
          storageAggregator: true,
        },
      }
    );
    if (
      !opportunity.context ||
      !opportunity.profile ||
      !opportunity.storageAggregator
    )
      throw new RelationshipNotFoundException(
        `Unable to load context, profile or storage aggregator for opportunity ${opportunity.id} `,
        LogContext.CONTEXT
      );
    // Clone the authorization policy
    const clonedAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        opportunity.authorization
      );
    // To ensure that profile + context on a space are always publicly visible, even for private challenges
    clonedAuthorization.anonymousReadAccess = true;

    opportunity.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        opportunity.profile,
        clonedAuthorization
      );

    opportunity.context =
      await this.contextAuthorizationService.applyAuthorizationPolicy(
        opportunity.context,
        clonedAuthorization
      );

    opportunity.storageAggregator =
      await this.storageAggregatorAuthorizationService.applyAuthorizationPolicy(
        opportunity.storageAggregator,
        opportunity.authorization
      );

    return opportunity;
  }

  public async propagateAuthorizationToCommunityCollaborationAgent(
    opportunityBase: IOpportunity,
    communityPolicy: ICommunityPolicy,
    license: ILicense
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
        communityPolicy,
        license
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
          projects: true,
        },
      }
    );
    if (!opportunity.projects)
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

    return await this.opportunityService.save(opportunity);
  }
}
