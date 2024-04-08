import { Inject, UseGuards } from '@nestjs/common';
import { Resolver, Args, Mutation } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { SpaceService } from './space.service';
import { UpdateSpaceInput } from '@domain/challenge/space';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { SpaceAuthorizationService } from './space.service.authorization';
import { ISpace } from './space.interface';
import { CreateSubspaceOnSpaceInput } from './dto/space.dto.create.subspace';
import { SubspaceCreatedPayload } from './dto/space.subspace.created.payload';
import { SubscriptionType } from '@common/enums/subscription.type';
import { PubSubEngine } from 'graphql-subscriptions';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { NameReporterService } from '@services/external/elasticsearch/name-reporter/name.reporter.service';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { LogContext } from '@common/enums';
import { UpdateSubspaceSettingsInput } from './dto/subspace.dto.update.settings';
import { UpdateSpaceSettingsOnSpaceInput } from './dto/space.dto.update.settings';
import { UpdateSpacePlatformSettingsInput } from './dto/space.dto.update.platform.settings';
import { SUBSCRIPTION_SUBSPACE_CREATED } from '@common/constants/providers';

@Resolver()
export class SpaceResolverMutations {
  constructor(
    private contributionReporter: ContributionReporterService,
    private activityAdapter: ActivityAdapter,
    private authorizationService: AuthorizationService,
    private spaceService: SpaceService,
    private spaceAuthorizationService: SpaceAuthorizationService,
    @Inject(SUBSCRIPTION_SUBSPACE_CREATED)
    private subspaceCreatedSubscription: PubSubEngine,
    private namingReporter: NameReporterService
  ) {}

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
  @Mutation(() => ISpace, {
    description: 'Updates one of the Setting on a Space',
  })
  @Profiling.api
  async updateSpaceSettings(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('settingsData') settingsData: UpdateSpaceSettingsOnSpaceInput
  ): Promise<ISpace> {
    const space = await this.spaceService.getSpaceOrFail(settingsData.spaceID, {
      relations: {
        account: {
          authorization: true,
        },
      },
    });

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
    await this.spaceAuthorizationService.applyAuthorizationPolicy(
      updatedSpace,
      space.account.authorization
    );
    return await this.spaceService.getSpaceOrFail(space.id);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ISpace, {
    description:
      'Update the platform settings, such as nameID, of the specified Space.',
  })
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

    return await this.spaceService.updateSpacePlatformSettings(
      space,
      updateData
    );
  }

  // Mutation is here because authorization policies need to be reset
  // resetting works only on top level entities
  // this way we avoid the complexity and circular dependencies introduced
  // resetting the challenge policies
  @UseGuards(GraphqlGuard)
  @Mutation(() => ISpace, {
    description: 'Updates one of the settings on a Space',
  })
  @Profiling.api
  async updateSubspaceSettings(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('settingsData') settingsData: UpdateSubspaceSettingsInput
  ): Promise<ISpace> {
    const subspace = await this.spaceService.getSpaceOrFail(
      settingsData.challengeID,
      {
        relations: {
          account: {
            space: true,
          },
        },
      }
    );
    if (!subspace.account || !subspace.account.space) {
      throw new EntityNotInitializedException(
        `Unable to find account for ${subspace.nameID}`,
        LogContext.CHALLENGES
      );
    }
    const spaceID = subspace.account.space.id;

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      subspace.authorization,
      AuthorizationPrivilege.UPDATE,
      `subspace settings update: ${subspace.id}`
    );

    const space = await this.spaceService.getSpaceOrFail(spaceID);
    // TODO: pass through the updated settings to the challenge service
    const updatedSpace = await this.updateSubspaceSettings(
      agentInfo,
      settingsData
    );
    // As the settings may update the authorization, the authorization policy will need to be reset
    await this.spaceAuthorizationService.applyAuthorizationPolicy(
      updatedSpace,
      space.authorization
    );
    return await this.spaceService.getSpaceOrFail(subspace.id);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ISpace, {
    description: 'Creates a new Space within the specified Space.',
  })
  @Profiling.api
  async createSpace(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('challengeData') challengeData: CreateSubspaceOnSpaceInput
  ): Promise<ISpace> {
    const space = await this.spaceService.getSpaceOrFail(
      challengeData.spaceID,
      {
        relations: {
          account: {
            license: {
              featureFlags: true,
            },
          },
        },
      }
    );
    if (!space.account || !space.account.license) {
      throw new EntityNotInitializedException(
        `Unabl to load license for Space: ${space.id}`,
        LogContext.CHALLENGES
      );
    }
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      space.authorization,
      AuthorizationPrivilege.CREATE_SUBSPACE,
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
    const challenge = await this.spaceService.createSubspace(
      challengeData,
      agentInfo
    );

    await this.spaceAuthorizationService.applyAuthorizationPolicy(
      challenge,
      space.authorization
    );

    this.activityAdapter.challengeCreated(
      {
        triggeredBy: agentInfo.userID,
        subspace: challenge,
      },
      space.id
    );

    this.contributionReporter.challengeCreated(
      {
        id: challenge.id,
        name: challenge.profile.displayName,
        space: space.id,
      },
      {
        id: agentInfo.userID,
        email: agentInfo.email,
      }
    );

    const challengeCreatedEvent: SubspaceCreatedPayload = {
      eventID: `space-challenge-created-${Math.round(Math.random() * 100)}`,
      journeyID: space.id,
      childJourney: challenge,
    };
    this.subspaceCreatedSubscription.publish(
      SubscriptionType.SUBSPACE_CREATED,
      challengeCreatedEvent
    );

    return challenge;
  }
}
