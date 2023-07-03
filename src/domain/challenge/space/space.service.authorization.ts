import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { Repository } from 'typeorm';
import { AuthorizationPrivilege } from '@common/enums';
import { SpaceService } from './space.service';
import { ChallengeAuthorizationService } from '@domain/challenge/challenge/challenge.service.authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { BaseChallengeAuthorizationService } from '../base-challenge/base.challenge.service.authorization';
import { EntityNotInitializedException } from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ISpace } from './space.interface';
import { Space } from './space.entity';
import { SpacePreferenceType } from '@common/enums/space.preference.type';
import { IOrganization } from '@domain/community/organization';
import { AuthorizationPolicyRuleVerifiedCredential } from '@core/authorization/authorization.policy.rule.verified.credential';
import { PreferenceSetAuthorizationService } from '@domain/common/preference-set/preference.set.service.authorization';
import { PreferenceSetService } from '@domain/common/preference-set/preference.set.service';
import { IPreferenceSet } from '@domain/common/preference-set';
import { TemplatesSetAuthorizationService } from '@domain/template/templates-set/templates.set.service.authorization';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { CommunityPolicyFlag } from '@common/enums/community.policy.flag';
import { CommunityPolicyService } from '@domain/community/community-policy/community.policy.service';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { TimelineAuthorizationService } from '@domain/timeline/timeline/timeline.service.authorization';
import { CollaborationAuthorizationService } from '@domain/collaboration/collaboration/collaboration.service.authorization';
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
  CREDENTIAL_RULE_SPACE_FILE_UPLOAD,
} from '@common/constants';
import { StorageBucketAuthorizationService } from '@domain/storage/storage-bucket/storage.bucket.service.authorization';

@Injectable()
export class SpaceAuthorizationService {
  constructor(
    private baseChallengeAuthorizationService: BaseChallengeAuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private challengeAuthorizationService: ChallengeAuthorizationService,
    private templatesSetAuthorizationService: TemplatesSetAuthorizationService,
    private timelineAuthorizationService: TimelineAuthorizationService,
    private preferenceSetAuthorizationService: PreferenceSetAuthorizationService,
    private preferenceSetService: PreferenceSetService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private communityPolicyService: CommunityPolicyService,
    private collaborationAuthorizationService: CollaborationAuthorizationService,
    private storageBucketAuthorizationService: StorageBucketAuthorizationService,
    private spaceService: SpaceService,
    @InjectRepository(Space)
    private spaceRepository: Repository<Space>
  ) {}

  async applyAuthorizationPolicy(space: ISpace): Promise<ISpace> {
    const preferenceSet = await this.spaceService.getPreferenceSetOrFail(
      space.id
    );
    const spacePolicy = await this.spaceService.getCommunityPolicy(space);
    this.setCommunityPolicyFlags(spacePolicy, preferenceSet);

    const spaceVisibility = this.spaceService.getVisibility(space);
    const hostOrg = await this.spaceService.getHost(space.id);

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
    switch (spaceVisibility) {
      case SpaceVisibility.ACTIVE:
      case SpaceVisibility.DEMO:
        space.authorization = this.extendAuthorizationPolicyLocal(
          space.authorization,
          space.id,
          spacePolicy
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
    const spaceSaved = await this.propagateAuthorizationToChildEntities(
      space,
      spacePolicy
    );

    // Finally update the child community directly after propagation
    switch (spaceVisibility) {
      case SpaceVisibility.ACTIVE:
      case SpaceVisibility.DEMO:
        spaceSaved.community = await this.spaceService.getCommunity(spaceSaved);
        spaceSaved.community.authorization =
          this.extendCommunityAuthorizationPolicy(
            spaceSaved.community.authorization,
            spacePolicy,
            hostOrg
          );

        spaceSaved.storageBucket =
          await this.spaceService.getStorageBucketOrFail(spaceSaved.id);
        spaceSaved.storageBucket.authorization =
          this.extendStorageAuthorizationPolicy(
            spaceSaved.storageBucket.authorization,
            spacePolicy
          );

        spaceSaved.collaboration = await this.spaceService.getCollaboration(
          spaceSaved
        );
        break;
      case SpaceVisibility.ARCHIVED:
        break;
    }

    return await this.spaceRepository.save(spaceSaved);
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
  }

  private async propagateAuthorizationToChildEntities(
    spaceBase: ISpace,
    policy: ICommunityPolicy
  ): Promise<ISpace> {
    const space: ISpace =
      await this.baseChallengeAuthorizationService.applyAuthorizationPolicy(
        spaceBase,
        this.spaceRepository,
        policy
      );

    space.challenges = await this.spaceService.getChallenges(space);
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
        await this.spaceService.getPreferenceSetOrFail(space.id),
        space.authorization
      );

    space.templatesSet = await this.spaceService.getTemplatesSetOrFail(
      space.id
    );
    space.templatesSet =
      await this.templatesSetAuthorizationService.applyAuthorizationPolicy(
        space.templatesSet,
        space.authorization
      );

    space.storageBucket = await this.spaceService.getStorageBucketOrFail(
      space.id
    );
    space.storageBucket =
      await this.storageBucketAuthorizationService.applyAuthorizationPolicy(
        space.storageBucket,
        space.authorization
      );

    space.timeline = await this.spaceService.getTimelineOrFail(space.id);
    // Extend with contributor rules + then send into apply
    const clonedAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        space.authorization
      );

    const extendedAuthorizationContributors =
      this.collaborationAuthorizationService.appendCredentialRulesForContributors(
        clonedAuthorization,
        policy
      );
    space.timeline =
      await this.timelineAuthorizationService.applyAuthorizationPolicy(
        space.timeline,
        extendedAuthorizationContributors
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
      [this.communityPolicyService.getAdminCredential(policy)],
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
          [this.communityPolicyService.getMembershipCredential(policy)],
          CREDENTIAL_RULE_SPACE_MEMBERS_CREATE_CHALLENGES
        );
      memberChallenge.cascade = false;
      newRules.push(memberChallenge);
    }

    const spaceMember = this.authorizationPolicyService.createCredentialRule(
      [AuthorizationPrivilege.READ],
      [this.communityPolicyService.getMembershipCredential(policy)],
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

  private extendStorageAuthorizationPolicy(
    storageAuthorization: IAuthorizationPolicy | undefined,
    policy: ICommunityPolicy
  ): IAuthorizationPolicy {
    if (!storageAuthorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${JSON.stringify(policy)}`,
        LogContext.CHALLENGES
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // Any member can upload
    const membersCanUpload =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.FILE_UPLOAD],
        [this.communityPolicyService.getMembershipCredential(policy)],
        CREDENTIAL_RULE_SPACE_FILE_UPLOAD
      );
    membersCanUpload.cascade = false;
    newRules.push(membersCanUpload);

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      storageAuthorization,
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
