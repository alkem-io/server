import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  AuthorizationVerifiedCredential,
  LogContext,
} from '@common/enums';
import { Repository } from 'typeorm';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { EntityNotInitializedException } from '@common/exceptions';
import { BaseChallengeAuthorizationService } from '@domain/challenge/base-challenge/base.challenge.service.authorization';
import { OpportunityAuthorizationService } from '@domain/collaboration/opportunity/opportunity.service.authorization';
import { ChallengeService } from './challenge.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Challenge } from './challenge.entity';
import { IChallenge } from './challenge.interface';
import { PreferenceSetAuthorizationService } from '@domain/common/preference-set/preference.set.service.authorization';
import { PreferenceSetService } from '@domain/common/preference-set/preference.set.service';
import { ChallengePreferenceType } from '@common/enums/challenge.preference.type';
import { AuthorizationPolicyRuleVerifiedCredential } from '@core/authorization/authorization.policy.rule.verified.credential';
import { CommunityPolicyService } from '@domain/community/community-policy/community.policy.service';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { CommunityPolicyFlag } from '@common/enums/community.policy.flag';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { IAuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege.interface';

@Injectable()
export class ChallengeAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private baseChallengeAuthorizationService: BaseChallengeAuthorizationService,
    private challengeService: ChallengeService,
    private opportunityAuthorizationService: OpportunityAuthorizationService,
    private preferenceSetAuthorizationService: PreferenceSetAuthorizationService,
    private communityPolicyService: CommunityPolicyService,
    private preferenceSetService: PreferenceSetService,
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>
  ) {}

  async applyAuthorizationPolicy(
    challenge: IChallenge,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IChallenge> {
    const communityPolicy = await this.setCommunityPolicyFlags(challenge);
    const preferenceSet = await this.challengeService.getPreferenceSetOrFail(
      challenge.id
    );

    challenge.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        challenge.authorization,
        parentAuthorization
      );
    challenge.authorization = this.appendCredentialRules(
      challenge.authorization,
      communityPolicy
    );
    challenge.authorization = this.appendVerifiedCredentialRules(
      challenge.authorization,
      communityPolicy
    );
    challenge.authorization = this.appendPrivilegeRules(
      challenge.authorization,
      communityPolicy
    );

    // propagate authorization rules for child entities
    await this.baseChallengeAuthorizationService.applyAuthorizationPolicy(
      challenge,
      this.challengeRepository
    );

    challenge.community = await this.challengeService.getCommunity(
      challenge.id
    );
    challenge.community.authorization = this.extendCommunityAuthorizationPolicy(
      challenge.community.authorization,
      communityPolicy
    );

    challenge.collaboration = await this.challengeService.getCollaboration(
      challenge
    );
    challenge.collaboration.authorization =
      this.extendCollaborationAuthorizationPolicy(
        challenge.collaboration.authorization,
        communityPolicy
      );

    // Cascade
    challenge.childChallenges = await this.challengeService.getChildChallenges(
      challenge
    );
    if (challenge.childChallenges) {
      for (const childChallenge of challenge.childChallenges) {
        await this.applyAuthorizationPolicy(
          childChallenge,
          challenge.authorization
        );
      }
    }
    challenge.opportunities = await this.challengeService.getOpportunities(
      challenge.id
    );
    if (challenge.opportunities) {
      for (const opportunity of challenge.opportunities) {
        await this.opportunityAuthorizationService.applyAuthorizationPolicy(
          opportunity,
          challenge.authorization,
          communityPolicy
        );
      }
    }

    if (challenge.preferenceSet) {
      challenge.preferenceSet =
        await this.preferenceSetAuthorizationService.applyAuthorizationPolicy(
          preferenceSet,
          challenge.authorization
        );
    }

    return await this.challengeRepository.save(challenge);
  }

  public async setCommunityPolicyFlags(
    challenge: IChallenge
  ): Promise<ICommunityPolicy> {
    const preferenceSet = await this.challengeService.getPreferenceSetOrFail(
      challenge.id
    );
    const policy = await this.challengeService.getCommunityPolicy(challenge.id);
    // Anonymouse Read access
    const allowContextReview = this.preferenceSetService.getPreferenceValue(
      preferenceSet,
      ChallengePreferenceType.MEMBERSHIP_FEEDBACK_ON_CHALLENGE_CONTEXT
    );
    this.communityPolicyService.setFlag(
      policy,
      CommunityPolicyFlag.MEMBERSHIP_FEEDBACK_ON_CHALLENGE_CONTEXT,
      allowContextReview
    );

    //
    const allowHubMembersToApply = this.preferenceSetService.getPreferenceValue(
      preferenceSet,
      ChallengePreferenceType.MEMBERSHIP_APPLY_CHALLENGE_FROM_HUB_MEMBERS
    );
    this.communityPolicyService.setFlag(
      policy,
      CommunityPolicyFlag.MEMBERSHIP_APPLY_CHALLENGE_FROM_HUB_MEMBERS,
      allowHubMembersToApply
    );

    //
    const allowHubMembersToJoin = this.preferenceSetService.getPreferenceValue(
      preferenceSet,
      ChallengePreferenceType.MEMBERSHIP_JOIN_CHALLENGE_FROM_HUB_MEMBERS
    );
    this.communityPolicyService.setFlag(
      policy,
      CommunityPolicyFlag.MEMBERSHIP_JOIN_CHALLENGE_FROM_HUB_MEMBERS,
      allowHubMembersToJoin
    );

    //
    const allowHubMembersToContribute =
      this.preferenceSetService.getPreferenceValue(
        preferenceSet,
        ChallengePreferenceType.ALLOW_HUB_MEMBERS_TO_CONTRIBUTE
      );
    this.communityPolicyService.setFlag(
      policy,
      CommunityPolicyFlag.ALLOW_HUB_MEMBERS_TO_CONTRIBUTE,
      allowHubMembersToContribute
    );

    //
    const allowMembersToCreateOpportunities =
      this.preferenceSetService.getPreferenceValue(
        preferenceSet,
        ChallengePreferenceType.ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES
      );
    this.communityPolicyService.setFlag(
      policy,
      CommunityPolicyFlag.ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES,
      allowMembersToCreateOpportunities
    );

    //
    const allowNonMembersReadAccess =
      this.preferenceSetService.getPreferenceValue(
        preferenceSet,
        ChallengePreferenceType.ALLOW_NON_MEMBERS_READ_ACCESS
      );
    this.communityPolicyService.setFlag(
      policy,
      CommunityPolicyFlag.ALLOW_NON_MEMBERS_READ_ACCESS,
      allowNonMembersReadAccess
    );
    return policy;
  }

  private appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined,
    policy: ICommunityPolicy
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${JSON.stringify(policy)}`,
        LogContext.CHALLENGES
      );

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      this.createCredentialRules(policy)
    );

    return authorization;
  }

  private createCredentialRules(
    policy: ICommunityPolicy
  ): IAuthorizationPolicyRuleCredential[] {
    const rules: IAuthorizationPolicyRuleCredential[] = [];

    const challengeAdmin = this.authorizationPolicyService.createCredentialRule(
      [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.GRANT,
        AuthorizationPrivilege.DELETE,
      ],
      [this.communityPolicyService.getAdminCredential(policy)]
    );
    rules.push(challengeAdmin);

    const challengeMember =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.READ],
        [this.communityPolicyService.getMembershipCredential(policy)]
      );
    rules.push(challengeMember);

    const updateInnovationFlowRule =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.UPDATE_INNOVATION_FLOW],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_ADMIN_HUBS,
        ]
      );
    updateInnovationFlowRule.inheritable = false;
    rules.push(updateInnovationFlowRule);

    if (
      this.communityPolicyService.getFlag(
        policy,
        CommunityPolicyFlag.ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES
      )
    ) {
      const criteria = [
        this.communityPolicyService.getMembershipCredential(policy),
      ];
      if (
        this.communityPolicyService.getFlag(
          policy,
          CommunityPolicyFlag.ALLOW_HUB_MEMBERS_TO_CONTRIBUTE
        )
      ) {
        criteria.push(
          this.communityPolicyService.getParentMembershipCredential(policy)
        );
      }
      const createOpportunityRule =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.CREATE_OPPORTUNITY],
          criteria
        );
      createOpportunityRule.inheritable = false;
      rules.push(createOpportunityRule);
    }

    return rules;
  }

  private appendVerifiedCredentialRules(
    authorization: IAuthorizationPolicy | undefined,
    policy: ICommunityPolicy
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        'Authorization definition not found on Challenge',
        LogContext.CHALLENGES
      );

    return this.authorizationPolicyService.appendVerifiedCredentialAuthorizationRules(
      authorization,
      this.createVerifiedCredentialRules(policy)
    );
  }

  private createVerifiedCredentialRules(
    communityPolicy: ICommunityPolicy
  ): AuthorizationPolicyRuleVerifiedCredential[] {
    const rules: AuthorizationPolicyRuleVerifiedCredential[] = [];

    // Allow feedback based on a particular VC
    const allowContextReview = this.communityPolicyService.getFlag(
      communityPolicy,
      CommunityPolicyFlag.MEMBERSHIP_FEEDBACK_ON_CHALLENGE_CONTEXT
    );
    if (allowContextReview) {
      const theHagueCredential = new AuthorizationPolicyRuleVerifiedCredential(
        [AuthorizationPrivilege.COMMUNITY_CONTEXT_REVIEW],
        AuthorizationVerifiedCredential.THE_HAGUE_ADDRESS,
        { name: 'plaats', value: 'Den Haag' }
      );
      rules.push(theHagueCredential);
    }

    return rules;
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

    const parentCommunityCredential =
      this.communityPolicyService.getParentMembershipCredential(policy);

    // Allow member of the parent community to Apply
    const allowHubMembersToApply = this.communityPolicyService.getFlag(
      policy,
      CommunityPolicyFlag.MEMBERSHIP_APPLY_CHALLENGE_FROM_HUB_MEMBERS
    );
    if (allowHubMembersToApply) {
      const hubMemberCanApply =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.COMMUNITY_APPLY],
          [parentCommunityCredential]
        );
      hubMemberCanApply.inheritable = false;
      newRules.push(hubMemberCanApply);
    }

    // Allow member of the parent community to Join
    const allowHubMembersToJoin = this.communityPolicyService.getFlag(
      policy,
      CommunityPolicyFlag.MEMBERSHIP_JOIN_CHALLENGE_FROM_HUB_MEMBERS
    );
    if (allowHubMembersToJoin) {
      const hubMemberCanJoin =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.COMMUNITY_JOIN],
          [parentCommunityCredential]
        );
      hubMemberCanJoin.inheritable = false;
      newRules.push(hubMemberCanJoin);
    }

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
  }

  private extendCollaborationAuthorizationPolicy(
    authorization: IAuthorizationPolicy | undefined,
    policy: ICommunityPolicy
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        'Authorization definition not found',
        LogContext.CHALLENGES
      );

    const rules: IAuthorizationPolicyRuleCredential[] = [];

    // Who is able to contribute
    const contributors = [
      this.communityPolicyService.getMembershipCredential(policy),
    ];
    if (
      this.communityPolicyService.getFlag(
        policy,
        CommunityPolicyFlag.ALLOW_HUB_MEMBERS_TO_CONTRIBUTE
      )
    ) {
      contributors.push(
        this.communityPolicyService.getParentMembershipCredential(policy)
      );
    }
    const contributorsRule =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.CONTRIBUTE],
        contributors
      );
    rules.push(contributorsRule);

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      rules
    );

    return authorization;
  }

  private appendPrivilegeRules(
    authorization: IAuthorizationPolicy | undefined,
    policy: ICommunityPolicy
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for policy: ${policy}`,
        LogContext.CHALLENGES
      );
    const privilegeRules: IAuthorizationPolicyRulePrivilege[] = [];

    const createPrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.CREATE_OPPORTUNITY],
      AuthorizationPrivilege.CREATE
    );
    privilegeRules.push(createPrivilege);

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }
}
