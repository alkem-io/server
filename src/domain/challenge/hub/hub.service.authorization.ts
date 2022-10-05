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
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
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
    private hubService: HubService,
    @InjectRepository(Hub)
    private hubRepository: Repository<Hub>
  ) {}

  async applyAuthorizationPolicy(hub: IHub): Promise<IHub> {
    const preferenceSet = await this.hubService.getPreferenceSetOrFail(hub.id);

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
          preferenceSet
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
            hubSaved.id,
            preferenceSet,
            hostOrg
          );
        break;
      case HubVisibility.ARCHIVED:
        break;
    }

    return await this.hubRepository.save(hubSaved);
  }

  private async propagateAuthorizationToChildEntities(
    hubBase: IHub
  ): Promise<IHub> {
    const hub: IHub =
      await this.baseChallengeAuthorizationService.applyAuthorizationPolicy(
        hubBase,
        this.hubRepository
      );
    // propagate authorization rules for child entities
    const hubCommunityCredential =
      await this.hubService.getCommunityMembershipCredential(hub);
    hub.challenges = await this.hubService.getChallenges(hub);
    for (const challenge of hub.challenges) {
      await this.challengeAuthorizationService.applyAuthorizationPolicy(
        challenge,
        hub.authorization,
        hubCommunityCredential
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
    const newRules: AuthorizationPolicyRuleCredential[] = [];
    // By default it is world visible
    authorization.anonymousReadAccess = true;

    // Allow global admins to reset authorization
    const globalAdminNotInherited = new AuthorizationPolicyRuleCredential(
      [AuthorizationPrivilege.AUTHORIZATION_RESET],
      AuthorizationCredential.GLOBAL_ADMIN
    );
    globalAdminNotInherited.inheritable = false;
    newRules.push(globalAdminNotInherited);

    // Allow global admin hubs to reset authorization
    const globalAdminHubsNotInherited = new AuthorizationPolicyRuleCredential(
      [AuthorizationPrivilege.AUTHORIZATION_RESET],
      AuthorizationCredential.GLOBAL_ADMIN_HUBS
    );
    globalAdminHubsNotInherited.inheritable = false;
    newRules.push(globalAdminHubsNotInherited);

    const communityAdmin = new AuthorizationPolicyRuleCredential(
      [AuthorizationPrivilege.READ],
      AuthorizationCredential.GLOBAL_ADMIN_COMMUNITY
    );
    newRules.push(communityAdmin);

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
    preferenceSet: IPreferenceSet
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${hubID}`,
        LogContext.CHALLENGES
      );
    const newRules: AuthorizationPolicyRuleCredential[] = [];

    authorization.anonymousReadAccess =
      this.preferenceSetService.getPreferenceValue(
        preferenceSet,
        HubPreferenceType.AUTHORIZATION_ANONYMOUS_READ_ACCESS
      );

    const hubAdmin = new AuthorizationPolicyRuleCredential(
      [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
        AuthorizationPrivilege.GRANT,
      ],
      AuthorizationCredential.HUB_ADMIN,
      hubID
    );
    newRules.push(hubAdmin);

    // Grant members privileges depending on the preferences
    const allowMembersToCreateChallengesPref =
      this.preferenceSetService.getPreferenceValue(
        preferenceSet,
        HubPreferenceType.ALLOW_MEMBERS_TO_CREATE_CHALLENGES
      );

    if (allowMembersToCreateChallengesPref) {
      const hubMember = new AuthorizationPolicyRuleCredential(
        [AuthorizationPrivilege.READ, AuthorizationPrivilege.CREATE_CHALLENGE],
        AuthorizationCredential.HUB_MEMBER,
        hubID
      );
      newRules.push(hubMember);
    } else {
      const hubMember = new AuthorizationPolicyRuleCredential(
        [AuthorizationPrivilege.READ],
        AuthorizationCredential.HUB_MEMBER,
        hubID
      );
      newRules.push(hubMember);
    }

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
  }

  private extendCommunityAuthorizationPolicy(
    communityAuthorization: IAuthorizationPolicy | undefined,
    hubID: string,
    preferenceSet: IPreferenceSet,
    hostOrg?: IOrganization
  ): IAuthorizationPolicy {
    if (!communityAuthorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${hubID}`,
        LogContext.CHALLENGES
      );

    const newRules: AuthorizationPolicyRuleCredential[] = [];

    // Any registered user can apply
    const allowAnyRegisteredUserToApply =
      this.preferenceSetService.getPreferenceValue(
        preferenceSet,
        HubPreferenceType.MEMBERSHIP_APPLICATIONS_FROM_ANYONE
      );
    if (allowAnyRegisteredUserToApply) {
      const anyUserCanApply = new AuthorizationPolicyRuleCredential(
        [AuthorizationPrivilege.COMMUNITY_APPLY],
        AuthorizationCredential.GLOBAL_REGISTERED
      );
      anyUserCanApply.inheritable = false;
      newRules.push(anyUserCanApply);
    }

    // Any registered user can join
    const allowAnyRegisteredUserToJoin =
      this.preferenceSetService.getPreferenceValue(
        preferenceSet,
        HubPreferenceType.MEMBERSHIP_JOIN_HUB_FROM_ANYONE
      );
    if (allowAnyRegisteredUserToJoin) {
      const anyUserCanJoin = new AuthorizationPolicyRuleCredential(
        [AuthorizationPrivilege.COMMUNITY_JOIN],
        AuthorizationCredential.GLOBAL_REGISTERED
      );
      anyUserCanJoin.inheritable = false;
      newRules.push(anyUserCanJoin);
    }

    // Host Org members to join
    const allowHostOrganizationMemberToJoin =
      this.preferenceSetService.getPreferenceValue(
        preferenceSet,
        HubPreferenceType.MEMBERSHIP_JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS
      );
    if (allowHostOrganizationMemberToJoin) {
      if (!hostOrg)
        throw new EntityNotInitializedException(
          'Not able to extend to allowing membership for host org that is not specified',
          LogContext.CHALLENGES
        );
      const hostOrgMembersCanJoin = new AuthorizationPolicyRuleCredential(
        [AuthorizationPrivilege.COMMUNITY_JOIN],
        AuthorizationCredential.ORGANIZATION_MEMBER,
        hostOrg.id
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
