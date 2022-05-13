import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { UseGuards } from '@nestjs/common';
import { Resolver, Args, Mutation } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { HubService } from './hub.service';
import {
  CreateHubInput,
  DeleteHubInput,
  UpdateHubInput,
} from '@domain/challenge/hub';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { HubAuthorizationService } from './hub.service.authorization';
import { ChallengeAuthorizationService } from '@domain/challenge/challenge/challenge.service.authorization';
import { IHub } from './hub.interface';
import { IUser } from '@domain/community/user/user.interface';
import { AssignHubAdminInput } from './dto/hub.dto.assign.admin';
import { RemoveHubAdminInput } from './dto/hub.dto.remove.admin';
import { HubAuthorizationResetInput } from './dto/hub.dto.reset.authorization';
import { CreateChallengeOnHubInput } from '../challenge/dto/challenge.dto.create.in.hub';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { PreferenceService } from '@domain/common/preference/preference.service';
import { IPreference } from '@domain/common/preference/preference.interface';
import { PreferenceDefinitionSet } from '@common/enums/preference.definition.set';
import { UpdateHubPreferenceInput } from './dto/hub.dto.update.preference';
import { PreferenceSetService } from '@domain/common/preference-set/preference.set.service';
import { UpdateChallengePreferenceInput } from '@domain/challenge/challenge/dto/challenge.dto.update.preference';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
@Resolver()
export class HubResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private hubService: HubService,
    private hubAuthorizationService: HubAuthorizationService,
    private challengeService: ChallengeService,
    private challengeAuthorizationService: ChallengeAuthorizationService,
    private preferenceService: PreferenceService,
    private preferenceSetService: PreferenceSetService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IHub, {
    description: 'Creates a new Hub.',
  })
  @Profiling.api
  async createHub(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('hubData') hubData: CreateHubInput
  ): Promise<IHub> {
    const authorizationPolicy =
      this.authorizationPolicyService.getPlatformAuthorizationPolicy();
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorizationPolicy,
      AuthorizationPrivilege.CREATE_HUB,
      `updateHub: ${hubData.nameID}`
    );
    const hub = await this.hubService.createHub(hubData, agentInfo);
    return await this.hubAuthorizationService.applyAuthorizationPolicy(hub);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IHub, {
    description: 'Updates the Hub.',
  })
  @Profiling.api
  async updateHub(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('hubData') hubData: UpdateHubInput
  ): Promise<IHub> {
    const hub = await this.hubService.getHubOrFail(hubData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      hub.authorization,
      AuthorizationPrivilege.UPDATE,
      `updateHub: ${hub.nameID}`
    );

    // ensure working with UUID
    hubData.ID = hub.id;

    return await this.hubService.update(hubData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IPreference, {
    description: 'Updates one of the Preferences on a Hub',
  })
  @Profiling.api
  async updatePreferenceOnHub(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('preferenceData') preferenceData: UpdateHubPreferenceInput
  ) {
    const hub = await this.hubService.getHubOrFail(preferenceData.hubID);
    const preferenceSet = await this.hubService.getPreferenceSetOrFail(hub.id);

    const preference = await this.preferenceSetService.getPreferenceOrFail(
      preferenceSet,
      preferenceData.type
    );
    this.preferenceService.validatePreferenceTypeOrFail(
      preference,
      PreferenceDefinitionSet.HUB
    );

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      preference.authorization,
      AuthorizationPrivilege.UPDATE,
      `hub preference update: ${preference.id}`
    );
    const preferenceUpdated = await this.preferenceService.updatePreference(
      preference,
      preferenceData.value
    );
    // As the preferences may update the authorization for the Hub, the authorization policy will need to be reset
    await this.hubAuthorizationService.applyAuthorizationPolicy(hub);
    return preferenceUpdated;
  }
  // create mutation here because authorization policies need to be reset
  // resetting works only on top level entities
  // this way we avoid the complexity and circular dependencies introduced
  // resetting the challenge policies
  @UseGuards(GraphqlGuard)
  @Mutation(() => IPreference, {
    description: 'Updates one of the Preferences on a Challenge',
  })
  @Profiling.api
  async updatePreferenceOnChallenge(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('preferenceData') preferenceData: UpdateChallengePreferenceInput
  ) {
    const challenge = await this.challengeService.getChallengeOrFail(
      preferenceData.challengeID
    );
    const preferenceSet = await this.challengeService.getPreferenceSetOrFail(
      challenge.id
    );

    const preference = await this.preferenceSetService.getPreferenceOrFail(
      preferenceSet,
      preferenceData.type
    );
    this.preferenceService.validatePreferenceTypeOrFail(
      preference,
      PreferenceDefinitionSet.CHALLENGE
    );

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      preference.authorization,
      AuthorizationPrivilege.UPDATE,
      `organization preference update: ${preference.id}`
    );
    const preferenceUpdated = await this.preferenceService.updatePreference(
      preference,
      preferenceData.value
    );

    const hub = await this.hubService.getHubOrFail(challenge.hubID);
    const hubCommunityCredential =
      await this.hubService.getCommunityMembershipCredential(hub);
    // As the preferences may update the authorization, the authorization policy will need to be reset
    await this.challengeAuthorizationService.applyAuthorizationPolicy(
      challenge,
      hub.authorization,
      hubCommunityCredential
    );
    return preferenceUpdated;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IHub, {
    description: 'Deletes the specified Hub.',
  })
  async deleteHub(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteHubInput
  ): Promise<IHub> {
    const hub = await this.hubService.getHubOrFail(deleteData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      hub.authorization,
      AuthorizationPrivilege.DELETE,
      `deleteHub: ${hub.nameID}`
    );
    return await this.hubService.deleteHub(deleteData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IChallenge, {
    description: 'Creates a new Challenge within the specified Hub.',
  })
  @Profiling.api
  async createChallenge(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('challengeData') challengeData: CreateChallengeOnHubInput
  ): Promise<IChallenge> {
    const hub = await this.hubService.getHubOrFail(challengeData.hubID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      hub.authorization,
      AuthorizationPrivilege.CREATE,
      `challengeCreate: ${hub.nameID}`
    );
    const challenge = await this.hubService.createChallengeInHub(
      challengeData,
      agentInfo
    );
    const hubCommunityCredential =
      await this.hubService.getCommunityMembershipCredential(hub);
    return await this.challengeAuthorizationService.applyAuthorizationPolicy(
      challenge,
      hub.authorization,
      hubCommunityCredential
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IHub, {
    description: 'Reset the Authorization Policy on the specified Hub.',
  })
  @Profiling.api
  async authorizationPolicyResetOnHub(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('authorizationResetData')
    authorizationResetData: HubAuthorizationResetInput
  ): Promise<IHub> {
    const hub = await this.hubService.getHubOrFail(
      authorizationResetData.hubID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      hub.authorization,
      AuthorizationPrivilege.UPDATE,
      `reset authorization definition: ${agentInfo.email}`
    );
    return await this.hubAuthorizationService.applyAuthorizationPolicy(hub);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Assigns a User as an Hub Admin.',
  })
  @Profiling.api
  async assignUserAsHubAdmin(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: AssignHubAdminInput
  ): Promise<IUser> {
    const hub = await this.hubService.getHubOrFail(membershipData.hubID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      hub.authorization,
      AuthorizationPrivilege.GRANT,
      `assign user hub admin: ${hub.displayName}`
    );
    return await this.hubService.assignHubAdmin(membershipData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Removes a User from being an Hub Admin.',
  })
  @Profiling.api
  async removeUserAsHubAdmin(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: RemoveHubAdminInput
  ): Promise<IUser> {
    const hub = await this.hubService.getHubOrFail(membershipData.hubID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      hub.authorization,
      AuthorizationPrivilege.GRANT,
      `remove user hub admin: ${hub.displayName}`
    );
    return await this.hubService.removeHubAdmin(membershipData);
  }
}
