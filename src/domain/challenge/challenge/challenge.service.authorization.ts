import { Injectable } from '@nestjs/common';
import {
  AuthorizationPrivilege,
  AuthorizationVerifiedCredential,
  LogContext,
} from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { OpportunityAuthorizationService } from '@domain/collaboration/opportunity/opportunity.service.authorization';
import { ChallengeService } from './challenge.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
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
  CREDENTIAL_RULE_CHALLENGE_CREATE_OPPORTUNITY,
  CREDENTIAL_RULE_CHALLENGE_SPACE_MEMBER_APPLY,
  CREDENTIAL_RULE_CHALLENGE_SPACE_MEMBER_JOIN,
  CREDENTIAL_RULE_COMMUNITY_ADD_MEMBER,
} from '@common/constants';
import { CommunityRole } from '@common/enums/community.role';
import { InnovationFlowAuthorizationService } from '../innovation-flow/innovation.flow.service.authorization';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { ContextAuthorizationService } from '@domain/context/context/context.service.authorization';
import { CommunityAuthorizationService } from '@domain/community/community/community.service.authorization';
import { CollaborationAuthorizationService } from '@domain/collaboration/collaboration/collaboration.service.authorization';
import { StorageAggregatorAuthorizationService } from '@domain/storage/storage-aggregator/storage.aggregator.service.authorization';
import { ILicense } from '@domain/license/license/license.interface';
import { LicenseResolverService } from '@services/infrastructure/license-resolver/license.resolver.service';

@Injectable()
export class ChallengeAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private challengeService: ChallengeService,
    private opportunityAuthorizationService: OpportunityAuthorizationService,
    private preferenceSetAuthorizationService: PreferenceSetAuthorizationService,
    private communityPolicyService: CommunityPolicyService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private preferenceSetService: PreferenceSetService,
    private storageAggregatorAuthorizationService: StorageAggregatorAuthorizationService,
    private innovationFlowAuthorizationService: InnovationFlowAuthorizationService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private contextAuthorizationService: ContextAuthorizationService,
    private communityAuthorizationService: CommunityAuthorizationService,
    private licenseResolverService: LicenseResolverService,
    private collaborationAuthorizationService: CollaborationAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    challengeInput: IChallenge,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IChallenge> {
    const license = await this.licenseResolverService.getlicenseForSpace(
      challengeInput.spaceID
    );
    const communityPolicy = await this.setCommunityPolicyFlags(challengeInput);

    // private challenge or not?
    // If it is a private challenge then cannot inherit from Space
    const privateChallenge = !this.communityPolicyService.getFlag(
      communityPolicy,
      CommunityPolicyFlag.ALLOW_NON_MEMBERS_READ_ACCESS
    );
    if (!privateChallenge) {
      challengeInput.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          challengeInput.authorization,
          parentAuthorization
        );
    } else {
      challengeInput.authorization =
        this.initializeAuthorizationPrivateChallenge(
          challengeInput.authorization,
          communityPolicy
        );
    }
    challengeInput.authorization = this.appendCredentialRules(
      challengeInput.authorization,
      communityPolicy
    );
    challengeInput.authorization = this.appendVerifiedCredentialRules(
      challengeInput.authorization,
      communityPolicy
    );
    challengeInput.authorization = this.appendPrivilegeRules(
      challengeInput.authorization,
      communityPolicy
    );

    // propagate authorization rules for child entities
    return await this.propagateAuthorizationToChildEntities(
      challengeInput,
      communityPolicy,
      license
    );
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

  private async propagateAuthorizationToChildEntities(
    challengeBase: IChallenge,
    policy: ICommunityPolicy,
    license: ILicense
  ): Promise<IChallenge> {
    await this.challengeService.save(challengeBase);

    let challenge =
      await this.propagateAuthorizationToCommunityCollaborationAgent(
        challengeBase,
        policy,
        license
      );
    challenge = await this.propagateAuthorizationToProfileContext(challenge);
    return await this.propagateAuthorizationToOpportunitiesStorageChildChallengesPreferences(
      challenge,
      policy
    );
  }

  private async propagateAuthorizationToProfileContext(
    challengeBase: IChallenge
  ): Promise<IChallenge> {
    const challenge = await this.challengeService.getChallengeOrFail(
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
        `Unable to load context or profile for challenge ${challenge.id} `,
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
    challengeBase: IChallenge,
    communityPolicy: ICommunityPolicy,
    license: ILicense
  ): Promise<IChallenge> {
    const challenge = await this.challengeService.getChallengeOrFail(
      challengeBase.id,
      {
        relations: {
          community: true,
          collaboration: true,
          agent: true,
        },
      }
    );
    if (!challenge.community || !challenge.collaboration || !challenge.agent)
      throw new RelationshipNotFoundException(
        `Unable to load community or collaboration or agent for space ${challenge.id} `,
        LogContext.CHALLENGES
      );

    challenge.community =
      await this.communityAuthorizationService.applyAuthorizationPolicy(
        challenge.community,
        challenge.authorization
      );
    // Specific extension
    challenge.community.authorization = this.extendCommunityAuthorizationPolicy(
      challenge.community.authorization,
      communityPolicy
    );

    challenge.collaboration =
      await this.collaborationAuthorizationService.applyAuthorizationPolicy(
        challenge.collaboration,
        challenge.authorization,
        communityPolicy,
        license
      );

    challenge.agent.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        challenge.agent.authorization,
        challenge.authorization
      );
    return await this.challengeService.save(challenge);
  }

  public async propagateAuthorizationToOpportunitiesStorageChildChallengesPreferences(
    challengeBase: IChallenge,
    communityPolicy: ICommunityPolicy
  ): Promise<IChallenge> {
    const challenge = await this.challengeService.getChallengeOrFail(
      challengeBase.id,
      {
        relations: {
          opportunities: true,
          childChallenges: true,
          storageAggregator: true,
          preferenceSet: true,
          innovationFlow: true,
        },
      }
    );
    if (
      !challenge.opportunities ||
      !challenge.storageAggregator ||
      !challenge.preferenceSet ||
      !challenge.innovationFlow
    )
      throw new RelationshipNotFoundException(
        `Unable to load child entities for challenge authorization: ${challenge.id} - ${challenge.opportunities} - ${challenge.storageAggregator} - ${challenge.innovationFlow}`,
        LogContext.CHALLENGES
      );

    challenge.storageAggregator =
      await this.storageAggregatorAuthorizationService.applyAuthorizationPolicy(
        challenge.storageAggregator,
        challenge.authorization
      );

    if (challenge.childChallenges) {
      for (const childChallenge of challenge.childChallenges) {
        await this.applyAuthorizationPolicy(
          childChallenge,
          challenge.authorization
        );
      }
    }

    for (const opportunity of challenge.opportunities) {
      await this.opportunityAuthorizationService.applyAuthorizationPolicy(
        opportunity,
        challenge.authorization,
        communityPolicy
      );
    }

    challenge.preferenceSet =
      await this.preferenceSetAuthorizationService.applyAuthorizationPolicy(
        challenge.preferenceSet,
        challenge.authorization
      );

    challenge.innovationFlow =
      await this.innovationFlowAuthorizationService.applyAuthorizationPolicy(
        challenge.innovationFlow,
        challenge.authorization
      );

    return await this.challengeService.save(challenge);
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
