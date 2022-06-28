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

@Injectable()
export class HubAuthorizationService {
  constructor(
    private baseChallengeAuthorizationService: BaseChallengeAuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private challengeAuthorizationService: ChallengeAuthorizationService,
    private templatesSetAuthorizationService: TemplatesSetAuthorizationService,
    private preferenceSetAuthorizationService: PreferenceSetAuthorizationService,
    private preferenceSetService: PreferenceSetService,
    private hubService: HubService,
    @InjectRepository(Hub)
    private hubRepository: Repository<Hub>
  ) {}

  async applyAuthorizationPolicy(hub: IHub): Promise<IHub> {
    const preferenceSet = await this.hubService.getPreferenceSetOrFail(hub.id);

    // Ensure always applying from a clean state
    hub.authorization = await this.authorizationPolicyService.reset(
      hub.authorization
    );
    hub.authorization =
      this.authorizationPolicyService.inheritPlatformAuthorization(
        hub.authorization
      );
    hub.authorization = this.extendAuthorizationPolicy(
      hub.authorization,
      hub.id
    );
    hub.authorization = this.appendVerifiedCredentialRules(hub.authorization);

    hub.authorization.anonymousReadAccess =
      this.preferenceSetService.getPreferenceValue(
        preferenceSet,
        HubPreferenceType.AUTHORIZATION_ANONYMOUS_READ_ACCESS
      );

    hub = await this.baseChallengeAuthorizationService.applyAuthorizationPolicy(
      hub,
      this.hubRepository
    );

    hub.community = await this.hubService.getCommunity(hub);
    const hostOrg = await this.hubService.getHost(hub.id);
    hub.community.authorization =
      await this.extendMembershipAuthorizationPolicy(
        hub.community.authorization,
        preferenceSet,
        hostOrg
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
        preferenceSet,
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

  private extendAuthorizationPolicy(
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

    const communityAdmin = new AuthorizationPolicyRuleCredential(
      [AuthorizationPrivilege.READ],
      AuthorizationCredential.GLOBAL_ADMIN_COMMUNITY
    );
    newRules.push(communityAdmin);

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

    const hubMember = new AuthorizationPolicyRuleCredential(
      [AuthorizationPrivilege.READ],
      AuthorizationCredential.HUB_MEMBER,
      hubID
    );
    newRules.push(hubMember);

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
  }

  private extendMembershipAuthorizationPolicy(
    authorization: IAuthorizationPolicy | undefined,
    preferenceSet: IPreferenceSet,
    hostOrg?: IOrganization
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${hostOrg?.id}`,
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
      authorization,
      newRules
    );

    return authorization;
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
