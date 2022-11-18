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
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
import { PreferenceSetAuthorizationService } from '@domain/common/preference-set/preference.set.service.authorization';
import { IPreferenceSet } from '@domain/common/preference-set/preference.set.interface';
import { PreferenceSetService } from '@domain/common/preference-set/preference.set.service';
import { ChallengePreferenceType } from '@common/enums/challenge.preference.type';
import { AuthorizationPolicyRuleVerifiedCredential } from '@core/authorization/authorization.policy.rule.verified.credential';
import { CommunityPolicyService } from '@domain/community/community-policy/community.policy.service';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { CommunityPolicyFlag } from '@common/enums/community.policy.flag';

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
    const preferenceSet = await this.challengeService.getPreferenceSetOrFail(
      challenge.id
    );
    const communityPolicy = await this.challengeService.getCommunityPolicy(
      challenge.id
    );
    this.setCommunityPolicyFlags(communityPolicy, preferenceSet);

    challenge.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        challenge.authorization,
        parentAuthorization
      );
    challenge.authorization = this.appendCredentialRules(
      challenge.authorization,
      challenge.id
    );
    challenge.authorization = this.appendVerifiedCredentialRules(
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
    challenge.community.authorization =
      await this.extendCommunityAuthorizationPolicy(
        challenge.community.authorization,
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
          challenge.authorization
        );
      }
    }

    if (preferenceSet) {
      challenge.preferenceSet =
        await this.preferenceSetAuthorizationService.applyAuthorizationPolicy(
          preferenceSet,
          challenge.authorization
        );
    }

    return await this.challengeRepository.save(challenge);
  }

  private setCommunityPolicyFlags(
    policy: ICommunityPolicy,
    preferenceSet: IPreferenceSet
  ) {
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
  }

  private appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined,
    challengeID: string
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${challengeID}`,
        LogContext.CHALLENGES
      );

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      this.createCredentialRules(challengeID)
    );

    return authorization;
  }

  private createCredentialRules(
    challengeID: string
  ): AuthorizationPolicyRuleCredential[] {
    const rules: AuthorizationPolicyRuleCredential[] = [];

    const challengeAdmin = new AuthorizationPolicyRuleCredential(
      [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.GRANT,
        AuthorizationPrivilege.DELETE,
      ],
      AuthorizationCredential.CHALLENGE_ADMIN,
      challengeID
    );
    rules.push(challengeAdmin);

    const challengeMember = new AuthorizationPolicyRuleCredential(
      [AuthorizationPrivilege.READ],
      AuthorizationCredential.CHALLENGE_MEMBER,
      challengeID
    );
    rules.push(challengeMember);

    const updateInnovationFlowRule = new AuthorizationPolicyRuleCredential(
      [AuthorizationPrivilege.UPDATE_INNOVATION_FLOW],
      AuthorizationCredential.GLOBAL_ADMIN
    );
    updateInnovationFlowRule.inheritable = false;
    rules.push(updateInnovationFlowRule);

    const updateInnovationFlowRuleHubs = new AuthorizationPolicyRuleCredential(
      [AuthorizationPrivilege.UPDATE_INNOVATION_FLOW],
      AuthorizationCredential.GLOBAL_ADMIN_HUBS
    );
    updateInnovationFlowRuleHubs.inheritable = false;
    rules.push(updateInnovationFlowRuleHubs);

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

    const newRules: AuthorizationPolicyRuleCredential[] = [];

    const parentCommunityCredential =
      this.communityPolicyService.getParentMembershipCredential(policy);

    // Allow member of the parent community to Apply
    const allowHubMembersToApply = this.communityPolicyService.getFlag(
      policy,
      CommunityPolicyFlag.MEMBERSHIP_APPLY_CHALLENGE_FROM_HUB_MEMBERS
    );
    if (allowHubMembersToApply) {
      const hubMemberCanApply = new AuthorizationPolicyRuleCredential(
        [AuthorizationPrivilege.COMMUNITY_APPLY],
        parentCommunityCredential.type,
        parentCommunityCredential.resourceID
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
      const hubMemberCanJoin = new AuthorizationPolicyRuleCredential(
        [AuthorizationPrivilege.COMMUNITY_JOIN],
        parentCommunityCredential.type,
        parentCommunityCredential.resourceID
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
}
