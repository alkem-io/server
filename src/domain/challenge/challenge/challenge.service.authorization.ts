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
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import {
  CREDENTIAL_RULE_CHALLENGE_SPACE_ADMINS,
  CREDENTIAL_RULE_CHALLENGE_ADMINS,
  CREDENTIAL_RULE_CHALLENGE_MEMBER_READ,
  CREDENTIAL_RULE_TYPES_CHALLENGE_INNOVATION_FLOW,
  CREDENTIAL_RULE_CHALLENGE_CREATE_OPPORTUNITY,
  CREDENTIAL_RULE_CHALLENGE_SPACE_MEMBER_APPLY,
  CREDENTIAL_RULE_CHALLENGE_SPACE_MEMBER_JOIN,
} from '@common/constants';
import { StorageBucketAuthorizationService } from '@domain/storage/storage-bucket/storage.bucket.service.authorization';
import { CommunityRole } from '@common/enums/community.role';

@Injectable()
export class ChallengeAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private baseChallengeAuthorizationService: BaseChallengeAuthorizationService,
    private challengeService: ChallengeService,
    private opportunityAuthorizationService: OpportunityAuthorizationService,
    private preferenceSetAuthorizationService: PreferenceSetAuthorizationService,
    private communityPolicyService: CommunityPolicyService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private preferenceSetService: PreferenceSetService,
    private storageBucketAuthorizationService: StorageBucketAuthorizationService,
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>
  ) {}

  async applyAuthorizationPolicy(
    challenge: IChallenge,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IChallenge> {
    const communityPolicy = await this.setCommunityPolicyFlags(challenge);

    // private challenge or not?
    // If it is a private challenge then cannot inherit from Space
    const privateChallenge = !this.communityPolicyService.getFlag(
      communityPolicy,
      CommunityPolicyFlag.ALLOW_NON_MEMBERS_READ_ACCESS
    );
    if (!privateChallenge) {
      challenge.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          challenge.authorization,
          parentAuthorization
        );
    } else {
      challenge.authorization = this.initializeAuthorizationPrivateChallenge(
        challenge.authorization,
        communityPolicy
      );
    }
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
      this.challengeRepository,
      communityPolicy
    );

    challenge.community = await this.challengeService.getCommunity(
      challenge.id
    );
    challenge.community.authorization = this.extendCommunityAuthorizationPolicy(
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
          challenge.authorization,
          communityPolicy
        );
      }
    }

    const preferenceSet = await this.challengeService.getPreferenceSetOrFail(
      challenge.id
    );
    if (preferenceSet) {
      challenge.preferenceSet =
        await this.preferenceSetAuthorizationService.applyAuthorizationPolicy(
          preferenceSet,
          challenge.authorization
        );
    }

    challenge.storageBucket =
      await this.challengeService.getStorageBucketOrFail(challenge.id);
    challenge.storageBucket =
      await this.storageBucketAuthorizationService.applyAuthorizationPolicy(
        challenge.storageBucket,
        challenge.authorization
      );

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
    const allowSpaceMembersToApply =
      this.preferenceSetService.getPreferenceValue(
        preferenceSet,
        ChallengePreferenceType.MEMBERSHIP_APPLY_CHALLENGE_FROM_SPACE_MEMBERS
      );
    this.communityPolicyService.setFlag(
      policy,
      CommunityPolicyFlag.MEMBERSHIP_APPLY_CHALLENGE_FROM_SPACE_MEMBERS,
      allowSpaceMembersToApply
    );

    //
    const allowSpaceMembersToJoin =
      this.preferenceSetService.getPreferenceValue(
        preferenceSet,
        ChallengePreferenceType.MEMBERSHIP_JOIN_CHALLENGE_FROM_SPACE_MEMBERS
      );
    this.communityPolicyService.setFlag(
      policy,
      CommunityPolicyFlag.MEMBERSHIP_JOIN_CHALLENGE_FROM_SPACE_MEMBERS,
      allowSpaceMembersToJoin
    );

    //
    const allowSpaceMembersToContribute =
      this.preferenceSetService.getPreferenceValue(
        preferenceSet,
        ChallengePreferenceType.ALLOW_SPACE_MEMBERS_TO_CONTRIBUTE
      );
    this.communityPolicyService.setFlag(
      policy,
      CommunityPolicyFlag.ALLOW_SPACE_MEMBERS_TO_CONTRIBUTE,
      allowSpaceMembersToContribute
    );

    //
    const allowContributorsToCreateOpportunities =
      this.preferenceSetService.getPreferenceValue(
        preferenceSet,
        ChallengePreferenceType.ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES
      );
    this.communityPolicyService.setFlag(
      policy,
      CommunityPolicyFlag.ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES,
      allowContributorsToCreateOpportunities
    );

    //
    const allowContributorsToCreateCallouts =
      this.preferenceSetService.getPreferenceValue(
        preferenceSet,
        ChallengePreferenceType.ALLOW_CONTRIBUTORS_TO_CREATE_CALLOUTS
      );
    this.communityPolicyService.setFlag(
      policy,
      CommunityPolicyFlag.ALLOW_CONTRIBUTORS_TO_CREATE_CALLOUTS,
      allowContributorsToCreateCallouts
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

  private initializeAuthorizationPrivateChallenge(
    authorization: IAuthorizationPolicy | undefined,
    policy: ICommunityPolicy
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${JSON.stringify(policy)}`,
        LogContext.CHALLENGES
      );

    authorization = this.authorizationPolicyService.reset(authorization);
    authorization =
      this.platformAuthorizationService.inheritRootAuthorizationPolicy(
        authorization
      );
    authorization.anonymousReadAccess = false;

    const rules = this.createPrivateChallengeBaseCredentialRules(policy);

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      rules
    );

    return authorization;
  }

  private createPrivateChallengeBaseCredentialRules(
    policy: ICommunityPolicy
  ): IAuthorizationPolicyRuleCredential[] {
    const rules: IAuthorizationPolicyRuleCredential[] = [];

    const challengeSpaceAdmins =
      this.authorizationPolicyService.createCredentialRule(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.GRANT,
          AuthorizationPrivilege.DELETE,
        ],
        [
          ...this.communityPolicyService.getAllCredentialsForRole(
            policy,
            CommunityRole.ADMIN
          ),
        ],
        CREDENTIAL_RULE_CHALLENGE_SPACE_ADMINS
      );
    rules.push(challengeSpaceAdmins);

    return rules;
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
      [
        this.communityPolicyService.getCredentialForRole(
          policy,
          CommunityRole.ADMIN
        ),
      ],
      CREDENTIAL_RULE_CHALLENGE_ADMINS
    );
    rules.push(challengeAdmin);

    const challengeMember =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.READ],
        [
          this.communityPolicyService.getCredentialForRole(
            policy,
            CommunityRole.MEMBER
          ),
        ],
        CREDENTIAL_RULE_CHALLENGE_MEMBER_READ
      );
    rules.push(challengeMember);

    const updateInnovationFlowRule =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.UPDATE_INNOVATION_FLOW],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_ADMIN_SPACES,
        ],
        CREDENTIAL_RULE_TYPES_CHALLENGE_INNOVATION_FLOW
      );
    updateInnovationFlowRule.cascade = false;
    rules.push(updateInnovationFlowRule);

    if (
      this.communityPolicyService.getFlag(
        policy,
        CommunityPolicyFlag.ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES
      )
    ) {
      const criteria = this.getContributorCriteria(policy);
      const createOpportunityRule =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.CREATE_OPPORTUNITY],
          criteria,
          CREDENTIAL_RULE_CHALLENGE_CREATE_OPPORTUNITY
        );
      createOpportunityRule.cascade = false;
      rules.push(createOpportunityRule);
    }

    return rules;
  }

  private getContributorCriteria(policy: ICommunityPolicy) {
    const criteria = [
      this.communityPolicyService.getCredentialForRole(
        policy,
        CommunityRole.MEMBER
      ),
    ];
    if (
      this.communityPolicyService.getFlag(
        policy,
        CommunityPolicyFlag.ALLOW_SPACE_MEMBERS_TO_CONTRIBUTE
      )
    ) {
      criteria.push(
        this.communityPolicyService.getDirectParentCredentialForRole(
          policy,
          CommunityRole.MEMBER
        )
      );
    }
    return criteria;
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
      this.communityPolicyService.getDirectParentCredentialForRole(
        policy,
        CommunityRole.MEMBER
      );

    // Allow member of the parent community to Apply
    const allowSpaceMembersToApply = this.communityPolicyService.getFlag(
      policy,
      CommunityPolicyFlag.MEMBERSHIP_APPLY_CHALLENGE_FROM_SPACE_MEMBERS
    );
    if (allowSpaceMembersToApply) {
      const spaceMemberCanApply =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.COMMUNITY_APPLY],
          [parentCommunityCredential],
          CREDENTIAL_RULE_CHALLENGE_SPACE_MEMBER_APPLY
        );
      spaceMemberCanApply.cascade = false;
      newRules.push(spaceMemberCanApply);
    }

    // Allow member of the parent community to Join
    const allowSpaceMembersToJoin = this.communityPolicyService.getFlag(
      policy,
      CommunityPolicyFlag.MEMBERSHIP_JOIN_CHALLENGE_FROM_SPACE_MEMBERS
    );
    if (allowSpaceMembersToJoin) {
      const spaceMemberCanJoin =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.COMMUNITY_JOIN],
          [parentCommunityCredential],
          CREDENTIAL_RULE_CHALLENGE_SPACE_MEMBER_JOIN
        );
      spaceMemberCanJoin.cascade = false;
      newRules.push(spaceMemberCanJoin);
    }

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
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
      AuthorizationPrivilege.CREATE,
      CREDENTIAL_RULE_CHALLENGE_CREATE_OPPORTUNITY
    );
    privilegeRules.push(createPrivilege);

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }
}
