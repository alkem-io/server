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
import { PlatformAuthorizationService } from '@src/platform/authorization/platform.authorization.service';
import { HubVisibility } from '@common/enums/hub.visibility';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { CommunityPolicyFlag } from '@common/enums/community.policy.flag';
import { CommunityPolicyService } from '@domain/community/community-policy/community.policy.service';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';

@Injectable()
export class HubAuthorizationService {
  constructor(
    private baseChallengeAuthorizationService: BaseChallengeAuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private challengeAuthorizationService: ChallengeAuthorizationService,
    private templatesSetAuthorizationService: TemplatesSetAuthorizationService,
    private preferenceSetAuthorizationService: PreferenceSetAuthorizationService,
    private preferenceSetService: PreferenceSetService,
    private platformAuthorizationService: PlatformAuthorizationService,
    private communityPolicyService: CommunityPolicyService,
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
      this.platformAuthorizationService.inheritPlatformAuthorization(
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
    const hubSaved = await this.propagateAuthorizationToChildEntities(hub);

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
        hubSaved.collaboration.authorization =
          this.extendCollaborationAuthorizationPolicy(
            hubSaved.collaboration.authorization,
            hubPolicy
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
  }

  private async propagateAuthorizationToChildEntities(
    hubBase: IHub
  ): Promise<IHub> {
    const hub: IHub =
      await this.baseChallengeAuthorizationService.applyAuthorizationPolicy(
        hubBase,
        this.hubRepository
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
          [AuthorizationPrivilege.DELETE]
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
        ]
      );
    authorizationReset.inheritable = false;
    newRules.push(authorizationReset);

    const communityAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.READ],
        [AuthorizationCredential.GLOBAL_ADMIN_COMMUNITY]
      );
    newRules.push(communityAdmin);

    // Allow Global admins + Global Hub Admins to manage access to Hubs + contents
    const globalAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.GRANT],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_ADMIN_HUBS,
        ]
      );
    newRules.push(globalAdmin);

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    // Ensure that CREATE also allows CREATE_CHALLENGE
    const createChallengePrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.CREATE_CHALLENGE],
      AuthorizationPrivilege.CREATE
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
      [this.communityPolicyService.getAdminCredential(policy)]
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
          [this.communityPolicyService.getMembershipCredential(policy)]
        );
      memberChallenge.inheritable = false;
      newRules.push(memberChallenge);
    }

    const hubMember = this.authorizationPolicyService.createCredentialRule(
      [AuthorizationPrivilege.READ],
      [this.communityPolicyService.getMembershipCredential(policy)]
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
          [AuthorizationCredential.GLOBAL_REGISTERED]
        );
      anyUserCanApply.inheritable = false;
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
          [AuthorizationCredential.GLOBAL_REGISTERED]
        );
      anyUserCanJoin.inheritable = false;
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
          ]
        );
      hostOrgMembersCanJoin.inheritable = false;
      newRules.push(hostOrgMembersCanJoin);
    }

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      communityAuthorization,
      newRules
    );

    return communityAuthorization;
  }

  private extendCollaborationAuthorizationPolicy(
    authorization: IAuthorizationPolicy | undefined,
    policy: ICommunityPolicy
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        'Authorization definition not found',
        LogContext.CHALLENGES
      );

    const rules: IAuthorizationPolicyRuleCredential[] = [];

    // Who is able to contribute
    const contributors = this.getContributorCredentials(policy);
    const contributorsRule =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.CONTRIBUTE],
        contributors
      );
    rules.push(contributorsRule);

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      rules
    );

    return authorization;
  }

  private getContributorCredentials(
    policy: ICommunityPolicy
  ): ICredentialDefinition[] {
    // add challenge members
    const contributors = [
      this.communityPolicyService.getMembershipCredential(policy),
    ];

    contributors.push({
      type: AuthorizationCredential.GLOBAL_ADMIN,
      resourceID: '',
    });
    contributors.push({
      type: AuthorizationCredential.GLOBAL_ADMIN_HUBS,
      resourceID: '',
    });
    return contributors;
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
