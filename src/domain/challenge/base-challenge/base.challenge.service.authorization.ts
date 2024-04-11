import { Injectable } from '@nestjs/common';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
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
  CREDENTIAL_RULE_MEMBER_CREATE_SUBSPACE,
  CREDENTIAL_RULE_SPACE_ADMINS,
  CREDENTIAL_RULE_SPACE_ADMIN_DELETE_SUBSPACE,
  CREDENTIAL_RULE_SPACE_HOST_ASSOCIATES_JOIN,
  CREDENTIAL_RULE_SPACE_MEMBERS_READ,
  CREDENTIAL_RULE_SUBSPACE_ADMINS,
  CREDENTIAL_RULE_TYPES_ACCOUNT_AUTHORIZATION_RESET,
  CREDENTIAL_RULE_TYPES_SPACE_COMMUNITY_APPLY_GLOBAL_REGISTERED,
  CREDENTIAL_RULE_TYPES_SPACE_COMMUNITY_JOIN_GLOBAL_REGISTERED,
  POLICY_RULE_SPACE_CREATE_SUBSPACE,
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
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { CredentialsSearchInput } from '@domain/agent';
import { SpaceSettingsService } from '../space.settings/space.settings.service';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';

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
    private collaborationAuthorizationService: CollaborationAuthorizationService,
    private spaceSettingsService: SpaceSettingsService
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
            agent: true,
            collaboration: true,
            community: {
              policy: true,
            },
            context: true,
            profile: true,
            storageAggregator: true,
          },
        }
      );
    if (
      !challengeBase.account ||
      !challengeBase.account.license ||
      !challengeBase.agent ||
      !challengeBase.collaboration ||
      !challengeBase.community ||
      !challengeBase.community.policy ||
      !challengeBase.context ||
      !challengeBase.profile ||
      !challengeBase.storageAggregator
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load entities on auth reset for space base ${challengeBase.id} `,
        LogContext.CHALLENGES
      );
    }
    const communityPolicy = this.getCommunityPolicyWithSettings(challengeBase);

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
        challengeBase.authorization,
        license,
        communityPolicy
      );
    // Specific extension
    challengeBase.community.authorization =
      this.extendCommunityAuthorizationPolicySubspace(
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

  private extendPrivilegeRuleCreateChallenge(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicy {
    // Ensure that CREATE also allows CREATE_CHALLENGE
    const createChallengePrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.CREATE_SUBSPACE],
      AuthorizationPrivilege.CREATE,
      POLICY_RULE_SPACE_CREATE_SUBSPACE
    );
    this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      [createChallengePrivilege]
    );

    return authorization;
  }

  public extendAuthorizationPolicyLocal(
    authorization: IAuthorizationPolicy,
    policy: ICommunityPolicy
  ): IAuthorizationPolicy {
    this.extendPrivilegeRuleCreateChallenge(authorization);

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    if (policy.settings.privacy.mode === SpacePrivacyMode.PRIVATE) {
      authorization.anonymousReadAccess = false;
    }

    const spaceMember = this.authorizationPolicyService.createCredentialRule(
      [AuthorizationPrivilege.READ],
      [
        this.communityPolicyService.getCredentialForRole(
          policy,
          CommunityRole.MEMBER
        ),
      ],
      CREDENTIAL_RULE_SPACE_MEMBERS_READ
    );
    newRules.push(spaceMember);

    const spaceAdmin = this.authorizationPolicyService.createCredentialRule(
      [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
        AuthorizationPrivilege.GRANT,
      ],
      [
        this.communityPolicyService.getCredentialForRole(
          policy,
          CommunityRole.ADMIN
        ),
      ],
      CREDENTIAL_RULE_SPACE_ADMINS
    );
    newRules.push(spaceAdmin);

    // Allow global admins to update platform settings
    const authorizationReset =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.PLATFORM_ADMIN],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_ADMIN_SPACES,
        ],
        CREDENTIAL_RULE_TYPES_ACCOUNT_AUTHORIZATION_RESET
      );
    authorizationReset.cascade = false;
    newRules.push(authorizationReset);

    const collaborationSettings = policy.settings.collaboration;
    if (collaborationSettings.allowMembersToCreateSubspaces) {
      const criteria = this.getContributorCriteria(policy);
      const createSubspacePrilegeRule =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.CREATE_SUBSPACE],
          criteria,
          CREDENTIAL_RULE_MEMBER_CREATE_SUBSPACE
        );
      createSubspacePrilegeRule.cascade = false;
      newRules.push(createSubspacePrilegeRule);
    }

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
  }

  public getCommunityPolicyWithSettings(
    spaceBaseInput: IBaseChallenge
  ): ICommunityPolicy {
    if (!spaceBaseInput.community?.policy)
      throw new EntityNotInitializedException(
        `Unable to load community policy on base space: ${spaceBaseInput.id}`,
        LogContext.CHALLENGES
      );

    const spaceSettings = this.spaceSettingsService.getSettings(
      spaceBaseInput.settingsStr
    );
    const communityPolicyWithFlags = spaceBaseInput.community.policy;
    communityPolicyWithFlags.settings = spaceSettings;
    return communityPolicyWithFlags;
  }

  private extendCommunityAuthorizationPolicySubspace(
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
    if (parentCommunityCredential) {
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

  public extendPrivateSubspaceAdmins(
    authorization: IAuthorizationPolicy | undefined,
    policy: ICommunityPolicy
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${JSON.stringify(policy)}`,
        LogContext.CHALLENGES
      );
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
        CREDENTIAL_RULE_SUBSPACE_ADMINS
      );
    rules.push(challengeSpaceAdmins);

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      rules
    );

    return authorization;
  }

  public extendCommunityAuthorizationPolicySpace(
    communityAuthorization: IAuthorizationPolicy | undefined,
    policy: ICommunityPolicy
  ): IAuthorizationPolicy {
    if (!communityAuthorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${JSON.stringify(policy)}`,
        LogContext.CHALLENGES
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const membershipPolicy = policy.settings.membership.policy;
    switch (membershipPolicy) {
      case CommunityMembershipPolicy.APPLICATIONS:
        const anyUserCanApply =
          this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
            [AuthorizationPrivilege.COMMUNITY_APPLY],
            [AuthorizationCredential.GLOBAL_REGISTERED],
            CREDENTIAL_RULE_TYPES_SPACE_COMMUNITY_APPLY_GLOBAL_REGISTERED
          );
        anyUserCanApply.cascade = false;
        newRules.push(anyUserCanApply);
        break;
      case CommunityMembershipPolicy.OPEN:
        const anyUserCanJoin =
          this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
            [AuthorizationPrivilege.COMMUNITY_JOIN],
            [AuthorizationCredential.GLOBAL_REGISTERED],
            CREDENTIAL_RULE_TYPES_SPACE_COMMUNITY_JOIN_GLOBAL_REGISTERED
          );
        anyUserCanJoin.cascade = false;
        newRules.push(anyUserCanJoin);
        break;
    }

    // Associates of trusted organizations can join
    const trustedOrganizationIDs: string[] = [];
    for (const trustedOrganizationID of trustedOrganizationIDs) {
      const hostOrgMembersCanJoin =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.COMMUNITY_JOIN],
          [
            {
              type: AuthorizationCredential.ORGANIZATION_ASSOCIATE,
              resourceID: trustedOrganizationID,
            },
          ],
          CREDENTIAL_RULE_SPACE_HOST_ASSOCIATES_JOIN
        );
      hostOrgMembersCanJoin.cascade = false;
      newRules.push(hostOrgMembersCanJoin);
    }

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      communityAuthorization,
      newRules
    );
  }

  public extendSubSpaceAuthorization(
    authorization: IAuthorizationPolicy | undefined,
    credentialCriteria: CredentialsSearchInput
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${JSON.stringify(
          credentialCriteria
        )}`,
        LogContext.CHALLENGES
      );
    this.authorizationPolicyService.appendCredentialAuthorizationRule(
      authorization,
      credentialCriteria,
      [AuthorizationPrivilege.DELETE],
      CREDENTIAL_RULE_SPACE_ADMIN_DELETE_SUBSPACE
    );
    return authorization;
  }

  private getContributorCriteria(
    policy: ICommunityPolicy
  ): ICredentialDefinition[] {
    const criteria = [
      this.communityPolicyService.getCredentialForRole(
        policy,
        CommunityRole.MEMBER
      ),
    ];
    const collaborationSettings = policy.settings.collaboration;
    if (
      collaborationSettings.inheritMembershipRights &&
      policy.settings.privacy.mode === SpacePrivacyMode.PUBLIC
    ) {
      const parentCredential =
        this.communityPolicyService.getDirectParentCredentialForRole(
          policy,
          CommunityRole.MEMBER
        );
      if (parentCredential) criteria.push(parentCredential);
    }
    return criteria;
  }
}
