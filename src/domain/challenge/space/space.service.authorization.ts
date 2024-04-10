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
import { SpacePreferenceType } from '@common/enums/space.preference.type';
import { IOrganization } from '@domain/community/organization';
import { AuthorizationPolicyRuleVerifiedCredential } from '@core/authorization/authorization.policy.rule.verified.credential';
import { PreferenceSetAuthorizationService } from '@domain/common/preference-set/preference.set.service.authorization';
import { PreferenceSetService } from '@domain/common/preference-set/preference.set.service';
import { IPreferenceSet } from '@domain/common/preference-set';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { CommunityPolicyFlag } from '@common/enums/community.policy.flag';
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
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { ContextAuthorizationService } from '@domain/context/context/context.service.authorization';
import { CommunityAuthorizationService } from '@domain/community/community/community.service.authorization';
import { CollaborationAuthorizationService } from '@domain/collaboration/collaboration/collaboration.service.authorization';
import { StorageAggregatorAuthorizationService } from '@domain/storage/storage-aggregator/storage.aggregator.service.authorization';
import { ILicense } from '@domain/license/license/license.interface';
import { AccountAuthorizationService } from '../account/account.service.authorization';

@Injectable()
export class SpaceAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private challengeAuthorizationService: ChallengeAuthorizationService,
    private preferenceSetAuthorizationService: PreferenceSetAuthorizationService,
    private preferenceSetService: PreferenceSetService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private communityPolicyService: CommunityPolicyService,
    private storageAggregatorAuthorizationService: StorageAggregatorAuthorizationService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private contextAuthorizationService: ContextAuthorizationService,
    private communityAuthorizationService: CommunityAuthorizationService,
    private collaborationAuthorizationService: CollaborationAuthorizationService,
    private accountAuthorizationService: AccountAuthorizationService,
    private spaceService: SpaceService,
    @InjectRepository(Space)
    private spaceRepository: Repository<Space>
  ) {}

  async applyAuthorizationPolicy(spaceInput: ISpace): Promise<ISpace> {
    let space = await this.spaceService.getSpaceOrFail(spaceInput.id, {
      relations: {
        preferenceSet: {
          preferences: true,
        },
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
      !space.preferenceSet ||
      !space.account ||
      !space.account.license
    )
      throw new RelationshipNotFoundException(
        `Unable to load Space with entities at start of auth reset: ${space.id} `,
        LogContext.CHALLENGES
      );

    const communityPolicyWithFlags = this.setCommunityPolicyFlags(
      space.community.policy,
      space.preferenceSet
    );

    const hostOrg = await this.spaceService.getHost(space.id);
    const license = space.account.license;

    // Ensure always applying from a clean state
    space.authorization = this.authorizationPolicyService.reset(
      space.authorization
    );
    space.authorization.anonymousReadAccess = false;
    space.authorization =
      this.platformAuthorizationService.inheritRootAuthorizationPolicy(
        space.authorization
      );

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
    await this.propagateAuthorizationToChildEntities(
      space,
      communityPolicyWithFlags,
      license
    );

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
          communityPolicyWithFlags,
          hostOrg
        );
        break;
      case SpaceVisibility.ARCHIVED:
        break;
    }

    return await this.spaceRepository.save(space);
  }

  private setCommunityPolicyFlags(
    policy: ICommunityPolicy,
    preferenceSet: IPreferenceSet
  ) {
    // Anonymouse Read access
    const anonReadAccess = this.preferenceSetService.getPreferenceValue(
      preferenceSet,
      SpacePreferenceType.AUTHORIZATION_ANONYMOUS_READ_ACCESS
    );
    this.communityPolicyService.setFlag(
      policy,
      CommunityPolicyFlag.ALLOW_ANONYMOUS_READ_ACCESS,
      anonReadAccess
    );

    // Allow applications from anyone
    const allowAnyRegisteredUserToApply =
      this.preferenceSetService.getPreferenceValue(
        preferenceSet,
        SpacePreferenceType.MEMBERSHIP_APPLICATIONS_FROM_ANYONE
      );

    this.communityPolicyService.setFlag(
      policy,
      CommunityPolicyFlag.MEMBERSHIP_APPLICATIONS_FROM_ANYONE,
      allowAnyRegisteredUserToApply
    );

    //
    const allowAnyRegisteredUserToJoin =
      this.preferenceSetService.getPreferenceValue(
        preferenceSet,
        SpacePreferenceType.MEMBERSHIP_JOIN_SPACE_FROM_ANYONE
      );
    this.communityPolicyService.setFlag(
      policy,
      CommunityPolicyFlag.MEMBERSHIP_JOIN_SPACE_FROM_ANYONE,
      allowAnyRegisteredUserToJoin
    );

    //
    const allowHostOrganizationMemberToJoin =
      this.preferenceSetService.getPreferenceValue(
        preferenceSet,
        SpacePreferenceType.MEMBERSHIP_JOIN_SPACE_FROM_HOST_ORGANIZATION_MEMBERS
      );
    this.communityPolicyService.setFlag(
      policy,
      CommunityPolicyFlag.MEMBERSHIP_JOIN_SPACE_FROM_HOST_ORGANIZATION_MEMBERS,
      allowHostOrganizationMemberToJoin
    );

    //
    const allowMembersToCreateChallengesPref =
      this.preferenceSetService.getPreferenceValue(
        preferenceSet,
        SpacePreferenceType.ALLOW_MEMBERS_TO_CREATE_CHALLENGES
      );
    this.communityPolicyService.setFlag(
      policy,
      CommunityPolicyFlag.ALLOW_MEMBERS_TO_CREATE_CHALLENGES,
      allowMembersToCreateChallengesPref
    );

    //
    const allowMembersToCreateCalloutsPref =
      this.preferenceSetService.getPreferenceValue(
        preferenceSet,
        SpacePreferenceType.ALLOW_MEMBERS_TO_CREATE_CALLOUTS
      );
    // Set the flag that is understood by Collaboration entity
    this.communityPolicyService.setFlag(
      policy,
      CommunityPolicyFlag.ALLOW_CONTRIBUTORS_TO_CREATE_CALLOUTS,
      allowMembersToCreateCalloutsPref
    );

    // Allow space members to contribute
    this.communityPolicyService.setFlag(
      policy,
      CommunityPolicyFlag.ALLOW_SPACE_MEMBERS_TO_CONTRIBUTE,
      true
    );
    return policy;
  }

  private async propagateAuthorizationToProfileContextLicense(
    spaceBase: ISpace
  ): Promise<ISpace> {
    const space = await this.spaceService.getSpaceOrFail(spaceBase.id, {
      relations: {
        context: true,
        profile: true,
        account: true,
      },
    });
    if (!space.context || !space.profile || !space.account)
      throw new RelationshipNotFoundException(
        `Unable to load context or profile for space ${space.id} `,
        LogContext.CHALLENGES
      );
    // NOTE: Clone the authorization policy to ensure the changes are local to context + profile
    const clonedAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        space.authorization
      );
    // To ensure that profile + context on a space are always publicly visible, even for private spaces
    clonedAuthorization.anonymousReadAccess = true;

    space.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        space.profile,
        clonedAuthorization
      );

    space.context =
      await this.contextAuthorizationService.applyAuthorizationPolicy(
        space.context,
        clonedAuthorization
      );

    space.account =
      await this.accountAuthorizationService.applyAuthorizationPolicy(
        space.account,
        spaceBase.authorization
      );

    return await this.spaceService.save(space);
  }

  public async propagateAuthorizationToCommunityCollaborationAgent(
    spaceBase: ISpace,
    communityPolicy: ICommunityPolicy,
    license: ILicense
  ): Promise<ISpace> {
    const space = await this.spaceService.getSpaceOrFail(spaceBase.id, {
      relations: {
        community: true,
        collaboration: true,
        agent: true,
      },
    });
    if (!space.community || !space.collaboration || !space.agent)
      throw new RelationshipNotFoundException(
        `Unable to load community or collaboration or agent for space ${space.id} `,
        LogContext.CHALLENGES
      );

    space.community =
      await this.communityAuthorizationService.applyAuthorizationPolicy(
        space.community,
        space.authorization,
        license,
        communityPolicy
      );

    space.collaboration =
      await this.collaborationAuthorizationService.applyAuthorizationPolicy(
        space.collaboration,
        space.authorization,
        communityPolicy,
        license
      );

    space.agent.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        space.agent.authorization,
        space.authorization
      );
    return await this.spaceService.save(space);
  }

  private async propagateAuthorizationToChildEntities(
    spaceBase: ISpace,
    policy: ICommunityPolicy,
    license: ILicense
  ): Promise<ISpace> {
    await this.spaceService.save(spaceBase);
    let space = await this.propagateAuthorizationToCommunityCollaborationAgent(
      spaceBase,
      policy,
      license
    );
    space = await this.propagateAuthorizationToProfileContextLicense(space);
    return await this.propagateAuthorizationToChallengesTemplatesStorage(space);
  }

  public async propagateAuthorizationToChallengesTemplatesStorage(
    spaceBase: ISpace
  ): Promise<ISpace> {
    const space = await this.spaceService.getSpaceOrFail(spaceBase.id, {
      relations: {
        challenges: true,
        storageAggregator: true,
        preferenceSet: true,
      },
    });
    if (!space.challenges || !space.storageAggregator || !space.preferenceSet)
      throw new RelationshipNotFoundException(
        `Unable to load challenges or storage or templates or preferences for space ${space.id} `,
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

    space.preferenceSet =
      await this.preferenceSetAuthorizationService.applyAuthorizationPolicy(
        space.preferenceSet,
        space.authorization
      );

    space.storageAggregator =
      await this.storageAggregatorAuthorizationService.applyAuthorizationPolicy(
        space.storageAggregator,
        space.authorization
      );

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
      [AuthorizationPrivilege.CREATE_CHALLENGE],
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

    authorization.anonymousReadAccess = this.communityPolicyService.getFlag(
      policy,
      CommunityPolicyFlag.AUTHORIZATION_ANONYMOUS_READ_ACCESS
    );

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

    // Members allowed to create challenges?
    const allowMembersToCreateChallengesPref =
      this.communityPolicyService.getFlag(
        policy,
        CommunityPolicyFlag.ALLOW_MEMBERS_TO_CREATE_CHALLENGES
      );
    if (allowMembersToCreateChallengesPref) {
      const memberChallenge =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.CREATE_CHALLENGE],
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
    policy: ICommunityPolicy,
    hostOrg?: IOrganization
  ): IAuthorizationPolicy {
    if (!communityAuthorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${JSON.stringify(policy)}`,
        LogContext.CHALLENGES
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // Any registered user can apply
    const allowAnyRegisteredUserToApply = this.communityPolicyService.getFlag(
      policy,
      CommunityPolicyFlag.MEMBERSHIP_APPLICATIONS_FROM_ANYONE
    );

    if (allowAnyRegisteredUserToApply) {
      const anyUserCanApply =
        this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
          [AuthorizationPrivilege.COMMUNITY_APPLY],
          [AuthorizationCredential.GLOBAL_REGISTERED],
          CREDENTIAL_RULE_TYPES_SPACE_COMMUNITY_APPLY_GLOBAL_REGISTERED
        );
      anyUserCanApply.cascade = false;
      newRules.push(anyUserCanApply);
    }

    // Any registered user can join
    const allowAnyRegisteredUserToJoin = this.communityPolicyService.getFlag(
      policy,
      CommunityPolicyFlag.MEMBERSHIP_JOIN_SPACE_FROM_ANYONE
    );
    if (allowAnyRegisteredUserToJoin) {
      const anyUserCanJoin =
        this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
          [AuthorizationPrivilege.COMMUNITY_JOIN],
          [AuthorizationCredential.GLOBAL_REGISTERED],
          CREDENTIAL_RULE_TYPES_SPACE_COMMUNITY_JOIN_GLOBAL_REGISTERED
        );
      anyUserCanJoin.cascade = false;
      newRules.push(anyUserCanJoin);
    }

    // Host Org members to join
    const allowHostOrganizationMemberToJoin =
      this.communityPolicyService.getFlag(
        policy,
        CommunityPolicyFlag.MEMBERSHIP_JOIN_SPACE_FROM_HOST_ORGANIZATION_MEMBERS
      );
    if (allowHostOrganizationMemberToJoin) {
      if (!hostOrg)
        throw new EntityNotInitializedException(
          'Not able to extend to allowing membership for host org that is not specified',
          LogContext.CHALLENGES
        );
      const hostOrgMembersCanJoin =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.COMMUNITY_JOIN],
          [
            {
              type: AuthorizationCredential.ORGANIZATION_ASSOCIATE,
              resourceID: hostOrg.id,
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
