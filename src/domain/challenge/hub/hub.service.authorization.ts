import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { Repository } from 'typeorm';
import { AuthorizationPrivilege } from '@common/enums';
import { HubService } from './hub.service';
import { ChallengeAuthorizationService } from '@domain/challenge/challenge/challenge.service.authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { BaseChallengeAuthorizationService } from '../base-challenge/base.challenge.service.authorization';
import { EntityNotInitializedException } from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IHub } from './hub.interface';
import { Hub } from './hub.entity';
import { HubPreferenceType } from '@common/enums/hub.preference.type';
import { IOrganization } from '@domain/community';
import { AuthorizationPolicyRuleVerifiedCredential } from '@core/authorization/authorization.policy.rule.verified.credential';
import { PreferenceSetAuthorizationService } from '@domain/common/preference-set/preference.set.service.authorization';
import { PreferenceSetService } from '@domain/common/preference-set/preference.set.service';
import { IPreferenceSet } from '@domain/common/preference-set';
import { TemplatesSetAuthorizationService } from '@domain/template/templates-set/templates.set.service.authorization';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { HubVisibility } from '@common/enums/hub.visibility';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { CommunityPolicyFlag } from '@common/enums/community.policy.flag';
import { CommunityPolicyService } from '@domain/community/community-policy/community.policy.service';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { TimelineAuthorizationService } from '@domain/timeline/timeline/timeline.service.authorization';
import { CollaborationAuthorizationService } from '@domain/collaboration/collaboration/collaboration.service.authorization';
import {
  CREDENTIAL_RULE_CHALLENGE_HUB_ADMIN_DELETE,
  CREDENTIAL_RULE_TYPES_HUB_AUTHORIZATION_RESET,
  CREDENTIAL_RULE_TYPES_HUB_GLOBAL_ADMIN_COMMUNITY_READ,
  CREDENTIAL_RULE_TYPES_HUB_AUTHORIZATION_GLOBAL_ADMIN_GRANT,
  POLICY_RULE_HUB_CREATE_CHALLENGE,
  CREDENTIAL_RULE_HUB_ADMINS,
  CREDENTIAL_RULE_HUB_MEMBERS_CREATE_CHALLENGES,
  CREDENTIAL_RULE_HUB_MEMBERS_READ,
  CREDENTIAL_RULE_TYPES_HUB_COMMUNITY_APPLY_GLOBAL_REGISTERED,
  CREDENTIAL_RULE_TYPES_HUB_COMMUNITY_JOIN_GLOBAL_REGISTERED,
  CREDENTIAL_RULE_HUB_HOST_ASSOCIATES_JOIN,
} from '@common/constants';
import { StorageBucketAuthorizationService } from '@domain/storage/storage-bucket/storage.bucket.service.authorization';

@Injectable()
export class HubAuthorizationService {
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
    private hubService: HubService,
    @InjectRepository(Hub)
    private hubRepository: Repository<Hub>
  ) {}

  async applyAuthorizationPolicy(hub: IHub): Promise<IHub> {
    const preferenceSet = await this.hubService.getPreferenceSetOrFail(hub.id);
    const hubPolicy = await this.hubService.getCommunityPolicy(hub);
    this.setCommunityPolicyFlags(hubPolicy, preferenceSet);

    const hubVisibility = this.hubService.getVisibility(hub);
    const hostOrg = await this.hubService.getHost(hub.id);

    // Ensure always applying from a clean state
    hub.authorization = this.authorizationPolicyService.reset(
      hub.authorization
    );
    hub.authorization.anonymousReadAccess = false;
    hub.authorization =
      this.platformAuthorizationService.inheritRootAuthorizationPolicy(
        hub.authorization
      );

    // Extend for global roles
    hub.authorization = this.extendAuthorizationPolicyGlobal(
      hub.authorization,
      hub.id
    );
    // Extend rules depending on the Visibility
    switch (hubVisibility) {
      case HubVisibility.ACTIVE:
      case HubVisibility.DEMO:
        hub.authorization = this.extendAuthorizationPolicyLocal(
          hub.authorization,
          hub.id,
          hubPolicy
        );
        hub.authorization = this.appendVerifiedCredentialRules(
          hub.authorization
        );
        break;
      case HubVisibility.ARCHIVED:
        // ensure it has visibility privilege set to private
        hub.authorization.anonymousReadAccess = false;
        break;
    }

    // Cascade down
    const hubSaved = await this.propagateAuthorizationToChildEntities(
      hub,
      hubPolicy
    );

    // Finally update the child community directly after propagation
    switch (hubVisibility) {
      case HubVisibility.ACTIVE:
      case HubVisibility.DEMO:
        hubSaved.community = await this.hubService.getCommunity(hubSaved);
        hubSaved.community.authorization =
          this.extendCommunityAuthorizationPolicy(
            hubSaved.community.authorization,
            hubPolicy,
            hostOrg
          );

        hubSaved.collaboration = await this.hubService.getCollaboration(
          hubSaved
        );
        break;
      case HubVisibility.ARCHIVED:
        break;
    }

    return await this.hubRepository.save(hubSaved);
  }

  private setCommunityPolicyFlags(
    policy: ICommunityPolicy,
    preferenceSet: IPreferenceSet
  ) {
    // Anonymouse Read access
    const anonReadAccess = this.preferenceSetService.getPreferenceValue(
      preferenceSet,
      HubPreferenceType.AUTHORIZATION_ANONYMOUS_READ_ACCESS
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
        HubPreferenceType.MEMBERSHIP_APPLICATIONS_FROM_ANYONE
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
        HubPreferenceType.MEMBERSHIP_JOIN_HUB_FROM_ANYONE
      );
    this.communityPolicyService.setFlag(
      policy,
      CommunityPolicyFlag.MEMBERSHIP_JOIN_HUB_FROM_ANYONE,
      allowAnyRegisteredUserToJoin
    );

    //
    const allowHostOrganizationMemberToJoin =
      this.preferenceSetService.getPreferenceValue(
        preferenceSet,
        HubPreferenceType.MEMBERSHIP_JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS
      );
    this.communityPolicyService.setFlag(
      policy,
      CommunityPolicyFlag.MEMBERSHIP_JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS,
      allowHostOrganizationMemberToJoin
    );

    //
    const allowMembersToCreateChallengesPref =
      this.preferenceSetService.getPreferenceValue(
        preferenceSet,
        HubPreferenceType.ALLOW_MEMBERS_TO_CREATE_CHALLENGES
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
        HubPreferenceType.ALLOW_MEMBERS_TO_CREATE_CALLOUTS
      );
    // Set the flag that is understood by Collaboration entity
    this.communityPolicyService.setFlag(
      policy,
      CommunityPolicyFlag.ALLOW_CONTRIBUTORS_TO_CREATE_CALLOUTS,
      allowMembersToCreateCalloutsPref
    );

    // Allow hub members to contribute
    this.communityPolicyService.setFlag(
      policy,
      CommunityPolicyFlag.ALLOW_HUB_MEMBERS_TO_CONTRIBUTE,
      true
    );
  }

  private async propagateAuthorizationToChildEntities(
    hubBase: IHub,
    policy: ICommunityPolicy
  ): Promise<IHub> {
    const hub: IHub =
      await this.baseChallengeAuthorizationService.applyAuthorizationPolicy(
        hubBase,
        this.hubRepository,
        policy
      );

    hub.challenges = await this.hubService.getChallenges(hub);
    for (const challenge of hub.challenges) {
      await this.challengeAuthorizationService.applyAuthorizationPolicy(
        challenge,
        hub.authorization
      );
      challenge.authorization =
        await this.authorizationPolicyService.appendCredentialAuthorizationRule(
          challenge.authorization,
          {
            type: AuthorizationCredential.HUB_ADMIN,
            resourceID: hub.id,
          },
          [AuthorizationPrivilege.DELETE],
          CREDENTIAL_RULE_CHALLENGE_HUB_ADMIN_DELETE
        );
    }

    hub.preferenceSet =
      await this.preferenceSetAuthorizationService.applyAuthorizationPolicy(
        await this.hubService.getPreferenceSetOrFail(hub.id),
        hub.authorization
      );

    hub.templatesSet = await this.hubService.getTemplatesSetOrFail(hub.id);
    hub.templatesSet =
      await this.templatesSetAuthorizationService.applyAuthorizationPolicy(
        hub.templatesSet,
        hub.authorization
      );

    hub.storageBucket = await this.hubService.getStorageBucketOrFail(hub.id);
    hub.storageBucket =
      await this.storageBucketAuthorizationService.applyAuthorizationPolicy(
        hub.storageBucket,
        hub.authorization
      );

    hub.timeline = await this.hubService.getTimelineOrFail(hub.id);
    // Extend with contributor rules + then send into apply
    const clonedAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        hub.authorization
      );

    const extendedAuthorizationContributors =
      this.collaborationAuthorizationService.appendCredentialRulesForContributors(
        clonedAuthorization,
        policy
      );
    hub.timeline =
      await this.timelineAuthorizationService.applyAuthorizationPolicy(
        hub.timeline,
        extendedAuthorizationContributors
      );
    return await this.hubRepository.save(hub);
  }

  private extendAuthorizationPolicyGlobal(
    authorization: IAuthorizationPolicy | undefined,
    hubID: string
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${hubID}`,
        LogContext.CHALLENGES
      );
    const newRules: IAuthorizationPolicyRuleCredential[] = [];
    // By default it is world visible
    authorization.anonymousReadAccess = true;

    // Allow global admins to reset authorization
    const authorizationReset =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.AUTHORIZATION_RESET],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_ADMIN_HUBS,
        ],
        CREDENTIAL_RULE_TYPES_HUB_AUTHORIZATION_RESET
      );
    authorizationReset.cascade = false;
    newRules.push(authorizationReset);

    const communityAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.READ],
        [AuthorizationCredential.GLOBAL_ADMIN_COMMUNITY],
        CREDENTIAL_RULE_TYPES_HUB_GLOBAL_ADMIN_COMMUNITY_READ
      );
    newRules.push(communityAdmin);

    // Allow Global admins + Global Hub Admins to manage access to Hubs + contents
    const globalAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.GRANT],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_ADMIN_HUBS,
        ],
        CREDENTIAL_RULE_TYPES_HUB_AUTHORIZATION_GLOBAL_ADMIN_GRANT
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
      POLICY_RULE_HUB_CREATE_CHALLENGE
    );
    this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      [createChallengePrivilege]
    );

    return authorization;
  }

  private extendAuthorizationPolicyLocal(
    authorization: IAuthorizationPolicy | undefined,
    hubID: string,
    policy: ICommunityPolicy
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${hubID}`,
        LogContext.CHALLENGES
      );
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    authorization.anonymousReadAccess = this.communityPolicyService.getFlag(
      policy,
      CommunityPolicyFlag.AUTHORIZATION_ANONYMOUS_READ_ACCESS
    );

    const hubAdmin = this.authorizationPolicyService.createCredentialRule(
      [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
        AuthorizationPrivilege.GRANT,
      ],
      [this.communityPolicyService.getAdminCredential(policy)],
      CREDENTIAL_RULE_HUB_ADMINS
    );
    newRules.push(hubAdmin);

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
          CREDENTIAL_RULE_HUB_MEMBERS_CREATE_CHALLENGES
        );
      memberChallenge.cascade = false;
      newRules.push(memberChallenge);
    }

    const hubMember = this.authorizationPolicyService.createCredentialRule(
      [AuthorizationPrivilege.READ],
      [this.communityPolicyService.getMembershipCredential(policy)],
      CREDENTIAL_RULE_HUB_MEMBERS_READ
    );
    newRules.push(hubMember);

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
          CREDENTIAL_RULE_TYPES_HUB_COMMUNITY_APPLY_GLOBAL_REGISTERED
        );
      anyUserCanApply.cascade = false;
      newRules.push(anyUserCanApply);
    }

    // Any registered user can join
    const allowAnyRegisteredUserToJoin = this.communityPolicyService.getFlag(
      policy,
      CommunityPolicyFlag.MEMBERSHIP_JOIN_HUB_FROM_ANYONE
    );
    if (allowAnyRegisteredUserToJoin) {
      const anyUserCanJoin =
        this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
          [AuthorizationPrivilege.COMMUNITY_JOIN],
          [AuthorizationCredential.GLOBAL_REGISTERED],
          CREDENTIAL_RULE_TYPES_HUB_COMMUNITY_JOIN_GLOBAL_REGISTERED
        );
      anyUserCanJoin.cascade = false;
      newRules.push(anyUserCanJoin);
    }

    // Host Org members to join
    const allowHostOrganizationMemberToJoin =
      this.communityPolicyService.getFlag(
        policy,
        CommunityPolicyFlag.MEMBERSHIP_JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS
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
          CREDENTIAL_RULE_HUB_HOST_ASSOCIATES_JOIN
        );
      hostOrgMembersCanJoin.cascade = false;
      newRules.push(hostOrgMembersCanJoin);
    }

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      communityAuthorization,
      newRules
    );

    return communityAuthorization;
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
