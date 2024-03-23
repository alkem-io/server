import { Injectable } from '@nestjs/common';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CommunityPolicyService } from '@domain/community/community-policy/community.policy.service';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import {
  CREDENTIAL_RULE_CHALLENGE_SPACE_MEMBER_APPLY,
  CREDENTIAL_RULE_CHALLENGE_SPACE_MEMBER_JOIN,
  CREDENTIAL_RULE_COMMUNITY_ADD_MEMBER,
} from '@common/constants';
import { CommunityRole } from '@common/enums/community.role';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { ContextAuthorizationService } from '@domain/context/context/context.service.authorization';
import { CommunityAuthorizationService } from '@domain/community/community/community.service.authorization';
import { CollaborationAuthorizationService } from '@domain/collaboration/collaboration/collaboration.service.authorization';
import { StorageAggregatorAuthorizationService } from '@domain/storage/storage-aggregator/storage.aggregator.service.authorization';
import { ILicense } from '@domain/license/license/license.interface';
import { CommunityMembershipPolicy } from '@common/enums/community.membership.policy';
import { IBaseChallenge } from './base.challenge.interface';
import { BaseChallenge } from './base.challenge.entity';
import { Repository } from 'typeorm';
import { BaseChallengeService } from './base.challenge.service';

@Injectable()
export class BaseChallengeAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private baseChallengeService: BaseChallengeService,
    private communityPolicyService: CommunityPolicyService,
    private storageAggregatorAuthorizationService: StorageAggregatorAuthorizationService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private contextAuthorizationService: ContextAuthorizationService,
    private communityAuthorizationService: CommunityAuthorizationService,
    private collaborationAuthorizationService: CollaborationAuthorizationService
  ) {}

  public async propagateAuthorizationToChildEntities(
    challengeBaseInput: IBaseChallenge,
    license: ILicense,
    repository: Repository<BaseChallenge>
  ): Promise<IBaseChallenge> {
    const challengeBase =
      await this.baseChallengeService.getBaseChallengeOrFail(
        challengeBaseInput.id,
        repository,
        {
          relations: {
            account: {
              license: true,
            },
            community: {
              policy: true,
            },
            collaboration: true,
            agent: true,
            storageAggregator: true,
          },
        }
      );
    if (
      !challengeBase.account ||
      !challengeBase.account.license ||
      !challengeBase.community ||
      !challengeBase.community.policy ||
      !challengeBase.context ||
      !challengeBase.profile ||
      !challengeBase.community ||
      !challengeBase.collaboration ||
      !challengeBase.agent ||
      !challengeBase.storageAggregator
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load entities on auth reset for space base ${challengeBase.id} `,
        LogContext.CHALLENGES
      );
    }
    const communityPolicy = challengeBase.community.policy;

    // Clone the authorization policy
    const clonedAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        challengeBase.authorization
      );
    // To ensure that profile + context on a space are always publicly visible, even for private challenges
    clonedAuthorization.anonymousReadAccess = true;

    challengeBase.community =
      await this.communityAuthorizationService.applyAuthorizationPolicy(
        challengeBase.community,
        challengeBase.authorization
      );
    // Specific extension
    challengeBase.community.authorization =
      this.extendCommunityAuthorizationPolicy(
        challengeBase.community.authorization,
        communityPolicy
      );

    challengeBase.collaboration =
      await this.collaborationAuthorizationService.applyAuthorizationPolicy(
        challengeBase.collaboration,
        challengeBase.authorization,
        communityPolicy,
        license
      );

    challengeBase.agent.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        challengeBase.agent.authorization,
        challengeBase.authorization
      );

    challengeBase.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        challengeBase.profile,
        clonedAuthorization
      );

    challengeBase.context =
      await this.contextAuthorizationService.applyAuthorizationPolicy(
        challengeBase.context,
        clonedAuthorization
      );

    challengeBase.storageAggregator =
      await this.storageAggregatorAuthorizationService.applyAuthorizationPolicy(
        challengeBase.storageAggregator,
        challengeBase.authorization
      );
    return await this.baseChallengeService.save(challengeBase, repository);
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
    const membershipSettings = policy.settings.membership;
    switch (membershipSettings.policy) {
      case CommunityMembershipPolicy.APPLICATIONS:
        const spaceMemberCanApply =
          this.authorizationPolicyService.createCredentialRule(
            [AuthorizationPrivilege.COMMUNITY_APPLY],
            [parentCommunityCredential],
            CREDENTIAL_RULE_CHALLENGE_SPACE_MEMBER_APPLY
          );
        spaceMemberCanApply.cascade = false;
        newRules.push(spaceMemberCanApply);
        break;
      case CommunityMembershipPolicy.OPEN:
        const spaceMemberCanJoin =
          this.authorizationPolicyService.createCredentialRule(
            [AuthorizationPrivilege.COMMUNITY_JOIN],
            [parentCommunityCredential],
            CREDENTIAL_RULE_CHALLENGE_SPACE_MEMBER_JOIN
          );
        spaceMemberCanJoin.cascade = false;
        newRules.push(spaceMemberCanJoin);
        break;
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
}
