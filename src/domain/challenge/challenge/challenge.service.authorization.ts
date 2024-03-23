import { Injectable } from '@nestjs/common';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { OpportunityAuthorizationService } from '@domain/challenge/opportunity/opportunity.service.authorization';
import { ChallengeService } from './challenge.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IChallenge } from './challenge.interface';
import { CommunityPolicyService } from '@domain/community/community-policy/community.policy.service';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { IAuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege.interface';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import {
  CREDENTIAL_RULE_CHALLENGE_SPACE_ADMINS,
  CREDENTIAL_RULE_CHALLENGE_ADMINS,
  CREDENTIAL_RULE_CHALLENGE_MEMBER_READ,
  CREDENTIAL_RULE_CHALLENGE_CREATE_OPPORTUNITY,
} from '@common/constants';
import { CommunityRole } from '@common/enums/community.role';
import { SpaceSettingsService } from '../space.settings/space.settings.service';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { BaseChallengeAuthorizationService } from '../base-challenge/base.challenge.service.authorization';
import { InjectRepository } from '@nestjs/typeorm';
import { Challenge } from './challenge.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ChallengeAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private challengeService: ChallengeService,
    private opportunityAuthorizationService: OpportunityAuthorizationService,
    private communityPolicyService: CommunityPolicyService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private spaceSettingsService: SpaceSettingsService,
    private baseChallengeAuthorizationService: BaseChallengeAuthorizationService,
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>
  ) {}

  async applyAuthorizationPolicy(
    challengeInput: IChallenge,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IChallenge> {
    const challenge = await this.challengeService.getChallengeOrFail(
      challengeInput.id,
      {
        relations: {
          account: {
            license: true,
          },
          community: {
            policy: true,
          },
        },
      }
    );
    if (
      !challenge.account ||
      !challenge.account.license ||
      !challenge.community ||
      !challenge.community.policy
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load entities to reset auth for challenge ${challenge.id} `,
        LogContext.CHALLENGES
      );
    }
    const license = challenge.account.license;

    challenge.community.policy.settings = this.spaceSettingsService.getSettings(
      challenge.settingsStr
    );
    const communityPolicy = challenge.community.policy;

    // If it is a private challenge then cannot inherit from Space
    if (communityPolicy.settings.privacy.mode === SpacePrivacyMode.PRIVATE) {
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

    challengeInput.authorization = this.appendPrivilegeRules(
      challengeInput.authorization,
      communityPolicy
    );

    // propagate authorization rules for child entities
    const challengePropagated =
      await this.baseChallengeAuthorizationService.propagateAuthorizationToChildEntities(
        challenge,
        license,
        this.challengeRepository
      );
    return await this.propagateAuthorizationToOpportunities(
      challengePropagated
    );
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

  public async propagateAuthorizationToOpportunities(
    challengeBase: IChallenge
  ): Promise<IChallenge> {
    const challenge = await this.challengeService.getChallengeOrFail(
      challengeBase.id,
      {
        relations: {
          opportunities: true,
        },
      }
    );
    if (!challenge.opportunities)
      throw new RelationshipNotFoundException(
        `Unable to load child entities for challenge authorization: ${challenge.id} - ${challenge.opportunities} - ${challenge.storageAggregator}`,
        LogContext.CHALLENGES
      );

    for (const opportunity of challenge.opportunities) {
      await this.opportunityAuthorizationService.applyAuthorizationPolicy(
        opportunity,
        challenge.authorization
      );
    }

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

    const collaborationSettings = policy.settings.collaboration;
    if (collaborationSettings.allowMembersToCreateSubspaces) {
      const criteria = this.getContributorCriteria(policy);
      const createOpportunityRule =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.CREATE_SUBSPACE],
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
    const collaborationSettings = policy.settings.collaboration;
    if (collaborationSettings.inheritMembershipRights) {
      criteria.push(
        this.communityPolicyService.getDirectParentCredentialForRole(
          policy,
          CommunityRole.MEMBER
        )
      );
    }
    return criteria;
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
      [AuthorizationPrivilege.CREATE_SUBSPACE],
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
