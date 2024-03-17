import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { Inject, UseGuards } from '@nestjs/common';
import { Resolver, Args, Mutation } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { SpaceService } from './space.service';
import {
  CreateSpaceInput,
  DeleteSpaceInput,
  UpdateSpaceInput,
} from '@domain/challenge/space';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { SpaceAuthorizationService } from './space.service.authorization';
import { ChallengeAuthorizationService } from '@domain/challenge/challenge/challenge.service.authorization';
import { ISpace } from './space.interface';
import { SpaceAuthorizationResetInput } from './dto/space.dto.reset.authorization';
import { CreateChallengeOnSpaceInput } from './dto/space.dto.create.challenge';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { UpdateSpacePlatformSettingsInput } from './dto/space.dto.update.platform.settings';
import { ChallengeCreatedPayload } from './dto/space.challenge.created.payload';
import { SubscriptionType } from '@common/enums/subscription.type';
import { SUBSCRIPTION_CHALLENGE_CREATED } from '@common/constants';
import { PubSubEngine } from 'graphql-subscriptions';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { NameReporterService } from '@services/external/elasticsearch/name-reporter/name.reporter.service';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { LogContext } from '@common/enums';
import { ISpaceDefaults } from '../space.defaults/space.defaults.interface';
import { UpdateSpaceDefaultsInput } from './dto/space.dto.update.defaults';
import { UpdateChallengeSettingsInput } from '../challenge/dto/challenge.dto.update.settings';
import { UpdateSpaceSettingsOnSpaceInput } from './dto/space.dto.update.settings';

@Resolver()
export class SpaceResolverMutations {
  constructor(
    private contributionReporter: ContributionReporterService,
    private activityAdapter: ActivityAdapter,
    private authorizationService: AuthorizationService,
    private spaceService: SpaceService,
    private spaceAuthorizationService: SpaceAuthorizationService,
    private challengeService: ChallengeService,
    private challengeAuthorizationService: ChallengeAuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    @Inject(SUBSCRIPTION_CHALLENGE_CREATED)
    private challengeCreatedSubscription: PubSubEngine,
    private namingReporter: NameReporterService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ISpace, {
    description: 'Creates a new Space.',
  })
  @Profiling.api
  async createSpace(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('spaceData') spaceData: CreateSpaceInput
  ): Promise<ISpace> {
    const authorizationPolicy =
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy();
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorizationPolicy,
      AuthorizationPrivilege.CREATE_SPACE,
      `create space: ${spaceData.nameID}`
    );
    const space = await this.spaceService.createSpace(spaceData, agentInfo);

    this.namingReporter.createOrUpdateName(
      space.id,
      spaceData.profileData.displayName
    );

    return await this.spaceAuthorizationService.applyAuthorizationPolicy(space);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ISpace, {
    description: 'Updates the Space.',
  })
  @Profiling.api
  async updateSpace(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('spaceData') spaceData: UpdateSpaceInput
  ): Promise<ISpace> {
    const space = await this.spaceService.getSpaceOrFail(spaceData.ID, {
      relations: {
        profile: true,
      },
    });
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      space.authorization,
      AuthorizationPrivilege.UPDATE,
      `updateSpace: ${space.nameID}`
    );

    // ensure working with UUID
    spaceData.ID = space.id;

    const updatedSpace = await this.spaceService.update(spaceData);

    this.contributionReporter.spaceContentEdited(
      {
        id: updatedSpace.id,
        name: updatedSpace.profile.displayName,
        space: updatedSpace.id,
      },
      {
        id: agentInfo.userID,
        email: agentInfo.email,
      }
    );

    if (
      spaceData?.profileData?.displayName &&
      spaceData?.profileData?.displayName !== space.profile.displayName
    ) {
      this.namingReporter.createOrUpdateName(
        space.id,
        spaceData?.profileData?.displayName
      );
    }

    return updatedSpace;
  }
  @UseGuards(GraphqlGuard)
  @Mutation(() => ISpaceDefaults, {
    description: 'Updates the specified SpaceDefaults.',
  })
  async updateSpaceDefaults(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('spaceDefaultsData')
    spaceDefaultsData: UpdateSpaceDefaultsInput
  ): Promise<ISpaceDefaults> {
    const space = await this.spaceService.getSpaceOrFail(
      spaceDefaultsData.spaceID,
      {
        relations: {
          defaults: true,
        },
      }
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      space.authorization,
      AuthorizationPrivilege.UPDATE,
      `update spaceDefaults: ${space.id}`
    );
    return await this.spaceService.updateSpaceDefaults(spaceDefaultsData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ISpace, {
    description:
      'Update the platform settings, such as license, of the specified Space.',
  })
  @Profiling.api
  async updateSpacePlatformSettings(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('updateData') updateData: UpdateSpacePlatformSettingsInput
  ): Promise<ISpace> {
    const space = await this.spaceService.getSpaceOrFail(updateData.spaceID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      space.authorization,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `update platform settings on space: ${space.id}`
    );

    const result = await this.spaceService.updateSpacePlatformSettings(
      updateData
    );

    // Update the authorization policy as most of the changes imply auth policy updates
    return await this.spaceAuthorizationService.applyAuthorizationPolicy(
      result
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ISpace, {
    description: 'Updates one of the Setting on a Space',
  })
  @Profiling.api
  async updateSpaceSettings(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('settingsData') settingsData: UpdateSpaceSettingsOnSpaceInput
  ): Promise<ISpace> {
    const space = await this.spaceService.getSpaceOrFail(settingsData.spaceID);

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      space.authorization,
      AuthorizationPrivilege.UPDATE,
      `space settings update: ${space.id}`
    );

    const updatedSpace = await this.spaceService.updateSpaceSettings(
      space,
      settingsData
    );
    // As the settings may update the authorization for the Space, the authorization policy will need to be reset
    await this.spaceAuthorizationService.applyAuthorizationPolicy(updatedSpace);
    return await this.spaceService.getSpaceOrFail(space.id);
  }

  // create mutation here because authorization policies need to be reset
  // resetting works only on top level entities
  // this way we avoid the complexity and circular dependencies introduced
  // resetting the challenge policies
  @UseGuards(GraphqlGuard)
  @Mutation(() => IChallenge, {
    description: 'Updates one of the settings on a Challenge',
  })
  @Profiling.api
  async updateChallengeSettings(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('settignsData') settingsData: UpdateChallengeSettingsInput
  ): Promise<IChallenge> {
    const challenge = await this.challengeService.getChallengeOrFail(
      settingsData.challengeID
    );

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      challenge.authorization,
      AuthorizationPrivilege.UPDATE,
      `challenge settings update: ${challenge.id}`
    );

    const space = await this.spaceService.getSpaceOrFail(
      this.challengeService.getSpaceID(challenge)
    );
    // TODO: pass through the updated settings to the challenge service
    const updatedChallenge = await this.challengeService.updateSpaceSettings(
      challenge,
      settingsData
    );
    // As the settings may update the authorization, the authorization policy will need to be reset
    await this.challengeAuthorizationService.applyAuthorizationPolicy(
      updatedChallenge,
      space.authorization
    );
    return await this.challengeService.getChallengeOrFail(challenge.id);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ISpace, {
    description: 'Deletes the specified Space.',
  })
  async deleteSpace(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteSpaceInput
  ): Promise<ISpace> {
    const space = await this.spaceService.getSpaceOrFail(deleteData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      space.authorization,
      AuthorizationPrivilege.DELETE,
      `deleteSpace: ${space.nameID}`
    );
    return await this.spaceService.deleteSpace(deleteData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IChallenge, {
    description: 'Creates a new Challenge within the specified Space.',
  })
  @Profiling.api
  async createChallenge(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('challengeData') challengeData: CreateChallengeOnSpaceInput
  ): Promise<IChallenge> {
    const space = await this.spaceService.getSpaceOrFail(
      challengeData.spaceID,
      {
        relations: {
          license: {
            featureFlags: true,
          },
        },
      }
    );
    if (!space.license) {
      throw new EntityNotInitializedException(
        `Unabl to load license for Space: ${space.id}`,
        LogContext.CHALLENGES
      );
    }
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      space.authorization,
      AuthorizationPrivilege.CREATE_CHALLENGE,
      `challengeCreate: ${space.nameID}`
    );

    // For the creation based on the template from another challenge require platform admin privileges
    if (challengeData.collaborationData?.collaborationTemplateID) {
      await this.authorizationService.grantAccessOrFail(
        agentInfo,
        space.authorization,
        AuthorizationPrivilege.CREATE,
        `challengeCreate using challenge template: ${space.nameID} - ${challengeData.collaborationData.collaborationTemplateID}`
      );
    }
    const challenge = await this.spaceService.createChallengeInSpace(
      challengeData,
      agentInfo
    );

    await this.challengeAuthorizationService.applyAuthorizationPolicy(
      challenge,
      space.authorization
    );

    this.activityAdapter.challengeCreated({
      triggeredBy: agentInfo.userID,
      challenge: challenge,
    });

    this.contributionReporter.challengeCreated(
      {
        id: challenge.id,
        name: challenge.profile.displayName,
        space: challenge.spaceID ?? '',
      },
      {
        id: agentInfo.userID,
        email: agentInfo.email,
      }
    );

    const challengeCreatedEvent: ChallengeCreatedPayload = {
      eventID: `space-challenge-created-${Math.round(Math.random() * 100)}`,
      spaceID: space.id,
      challenge,
    };
    this.challengeCreatedSubscription.publish(
      SubscriptionType.CHALLENGE_CREATED,
      challengeCreatedEvent
    );

    return challenge;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ISpace, {
    description: 'Reset the Authorization Policy on the specified Space.',
  })
  @Profiling.api
  async authorizationPolicyResetOnSpace(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('authorizationResetData')
    authorizationResetData: SpaceAuthorizationResetInput
  ): Promise<ISpace> {
    const space = await this.spaceService.getSpaceOrFail(
      authorizationResetData.spaceID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      space.authorization,
      AuthorizationPrivilege.UPDATE, // todo: replace with AUTHORIZATION_RESET once that has been granted
      `reset authorization definition: ${agentInfo.email}`
    );
    return await this.spaceAuthorizationService.applyAuthorizationPolicy(space);
  }
}
