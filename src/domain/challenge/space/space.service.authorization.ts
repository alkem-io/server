import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { Repository } from 'typeorm';
import { AuthorizationPrivilege } from '@common/enums';
import { SpaceService } from './space.service';
import { ChallengeAuthorizationService } from '@domain/challenge/challenge/challenge.service.authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ISpace } from './space.interface';
import { Space } from './space.entity';
import { AuthorizationPolicyRuleVerifiedCredential } from '@core/authorization/authorization.policy.rule.verified.credential';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { CommunityPolicyService } from '@domain/community/community-policy/community.policy.service';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import {
  CREDENTIAL_RULE_CHALLENGE_SPACE_ADMIN_DELETE,
  CREDENTIAL_RULE_TYPES_SPACE_AUTHORIZATION_RESET,
  CREDENTIAL_RULE_TYPES_SPACE_GLOBAL_ADMIN_COMMUNITY_READ,
  CREDENTIAL_RULE_TYPES_SPACE_AUTHORIZATION_GLOBAL_ADMIN_GRANT,
  POLICY_RULE_SPACE_CREATE_CHALLENGE,
  CREDENTIAL_RULE_SPACE_ADMINS,
  CREDENTIAL_RULE_SPACE_MEMBERS_CREATE_CHALLENGES,
  CREDENTIAL_RULE_SPACE_MEMBERS_READ,
  CREDENTIAL_RULE_TYPES_SPACE_COMMUNITY_APPLY_GLOBAL_REGISTERED,
  CREDENTIAL_RULE_TYPES_SPACE_COMMUNITY_JOIN_GLOBAL_REGISTERED,
  CREDENTIAL_RULE_SPACE_HOST_ASSOCIATES_JOIN,
} from '@common/constants';
import { CommunityRole } from '@common/enums/community.role';
import { SpaceSettingsService } from '../space.settings/space.settings.service';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { CommunityMembershipPolicy } from '@common/enums/community.membership.policy';
import { BaseChallengeAuthorizationService } from '../base-challenge/base.challenge.service.authorization';

@Injectable()
export class SpaceAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private challengeAuthorizationService: ChallengeAuthorizationService,
    private communityPolicyService: CommunityPolicyService,
    private baseChallengeAuthorizationService: BaseChallengeAuthorizationService,
    private spaceSettingsService: SpaceSettingsService,
    private spaceService: SpaceService,
    @InjectRepository(Space)
    private spaceRepository: Repository<Space>
  ) {}

  async applyAuthorizationPolicy(
    spaceInput: ISpace,
    parentAuthorization?: IAuthorizationPolicy | undefined
  ): Promise<ISpace> {
    let space = await this.spaceService.getSpaceOrFail(spaceInput.id, {
      relations: {
        community: {
          policy: true,
        },
        account: {
          license: true,
        },
      },
    });
    if (
      !space.community ||
      !space.community.policy ||
      !space.account ||
      !space.account.license
    )
      throw new RelationshipNotFoundException(
        `Unable to load Space with entities at start of auth reset: ${space.id} `,
        LogContext.CHALLENGES
      );
    let parentAuthorizationPolicy = parentAuthorization;
    if (!parentAuthorizationPolicy) {
      parentAuthorizationPolicy = space.account.authorization;
    }
    space.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        space.authorization,
        parentAuthorization
      );

    const spaceSettings = await this.spaceSettingsService.getSettings(
      space.settingsStr
    );
    const communityPolicyWithFlags = space.community.policy;
    communityPolicyWithFlags.settings = spaceSettings;
    const license = space.account.license;

    // Extend for global roles
    space.authorization = this.extendAuthorizationPolicyGlobal(
      space.authorization,
      space.id
    );

    // Extend rules depending on the Visibility
    switch (license.visibility) {
      case SpaceVisibility.ACTIVE:
      case SpaceVisibility.DEMO:
        space.authorization = this.extendAuthorizationPolicyLocal(
          space.authorization,
          space.id,
          communityPolicyWithFlags
        );
        space.authorization = this.appendVerifiedCredentialRules(
          space.authorization
        );
        break;
      case SpaceVisibility.ARCHIVED:
        // ensure it has visibility privilege set to private
        space.authorization.anonymousReadAccess = false;
        break;
    }

    // Cascade down
    // propagate authorization rules for child entities
    const spacePropagated =
      await this.baseChallengeAuthorizationService.propagateAuthorizationToChildEntities(
        space,
        license,
        this.spaceRepository
      );
    await this.propagateAuthorizationToChallenges(spacePropagated);

    // Reload, to get all the saves from save above + with
    // key entities loaded that are needed for next steps
    space = await this.spaceService.getSpaceOrFail(spaceInput.id, {
      relations: {
        community: true,
      },
    });
    if (!space.community)
      throw new RelationshipNotFoundException(
        `Unable to load Space after first save: ${space.id} `,
        LogContext.CHALLENGES
      );

    // Finally update the child entities that depend on license
    // directly after propagation
    switch (license.visibility) {
      case SpaceVisibility.ACTIVE:
      case SpaceVisibility.DEMO:
        space.community.authorization = this.extendCommunityAuthorizationPolicy(
          space.community.authorization,
          communityPolicyWithFlags
        );
        break;
      case SpaceVisibility.ARCHIVED:
        break;
    }

    return await this.spaceRepository.save(space);
  }

  public async propagateAuthorizationToChallenges(
    spaceBase: ISpace
  ): Promise<ISpace> {
    const space = await this.spaceService.getSpaceOrFail(spaceBase.id, {
      relations: {
        challenges: true,
      },
    });

    if (!space.challenges)
      throw new RelationshipNotFoundException(
        `Unable to load challenges for space ${space.id} `,
        LogContext.CHALLENGES
      );

    for (const challenge of space.challenges) {
      await this.challengeAuthorizationService.applyAuthorizationPolicy(
        challenge,
        space.authorization
      );
      challenge.authorization =
        await this.authorizationPolicyService.appendCredentialAuthorizationRule(
          challenge.authorization,
          {
            type: AuthorizationCredential.SPACE_ADMIN,
            resourceID: space.id,
          },
          [AuthorizationPrivilege.DELETE],
          CREDENTIAL_RULE_CHALLENGE_SPACE_ADMIN_DELETE
        );
    }

    return await this.spaceRepository.save(space);
  }

  private extendAuthorizationPolicyGlobal(
    authorization: IAuthorizationPolicy | undefined,
    spaceID: string
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${spaceID}`,
        LogContext.CHALLENGES
      );
    const newRules: IAuthorizationPolicyRuleCredential[] = [];
    // By default it is world visible
    authorization.anonymousReadAccess = true;

    // Allow global admins to reset authorization
    const authorizationReset =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.AUTHORIZATION_RESET,
          AuthorizationPrivilege.PLATFORM_ADMIN,
        ],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_ADMIN_SPACES,
        ],
        CREDENTIAL_RULE_TYPES_SPACE_AUTHORIZATION_RESET
      );
    authorizationReset.cascade = false;
    newRules.push(authorizationReset);

    const communityAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.READ],
        [AuthorizationCredential.GLOBAL_ADMIN_COMMUNITY],
        CREDENTIAL_RULE_TYPES_SPACE_GLOBAL_ADMIN_COMMUNITY_READ
      );
    newRules.push(communityAdmin);

    // Allow Global admins + Global Space Admins to manage access to Spaces + contents
    const globalAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.GRANT],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_ADMIN_SPACES,
        ],
        CREDENTIAL_RULE_TYPES_SPACE_AUTHORIZATION_GLOBAL_ADMIN_GRANT
      );
    newRules.push(globalAdmin);

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    // Ensure that CREATE also allows CREATE_CHALLENGE
    const createChallengePrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.CREATE_SUBSPACE],
      AuthorizationPrivilege.CREATE,
      POLICY_RULE_SPACE_CREATE_CHALLENGE
    );
    this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      [createChallengePrivilege]
    );

    return authorization;
  }

  private extendAuthorizationPolicyLocal(
    authorization: IAuthorizationPolicy | undefined,
    spaceID: string,
    policy: ICommunityPolicy
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${spaceID}`,
        LogContext.CHALLENGES
      );
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    authorization.anonymousReadAccess = true;
    if (policy.settings.privacy.mode === SpacePrivacyMode.PRIVATE) {
      authorization.anonymousReadAccess = false;
    }

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

    if (policy.settings.collaboration.allowMembersToCreateSubspaces) {
      const memberChallenge =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.CREATE_SUBSPACE],
          [
            this.communityPolicyService.getCredentialForRole(
              policy,
              CommunityRole.MEMBER
            ),
          ],
          CREDENTIAL_RULE_SPACE_MEMBERS_CREATE_CHALLENGES
        );
      memberChallenge.cascade = false;
      newRules.push(memberChallenge);
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

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
  }

  private extendCommunityAuthorizationPolicy(
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
  appendVerifiedCredentialRules(
    authorization: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        'Authorization definition not found for: ${hostOrg?.id}',
        LogContext.CHALLENGES
      );
    const rules: AuthorizationPolicyRuleVerifiedCredential[] = [];

    return this.authorizationPolicyService.appendVerifiedCredentialAuthorizationRules(
      authorization,
      rules
    );
  }
}
