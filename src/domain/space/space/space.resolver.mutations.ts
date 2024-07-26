import { Inject, UseGuards } from '@nestjs/common';
import { Resolver, Args, Mutation } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { SpaceService } from './space.service';
import { UpdateSpaceInput } from '@domain/space/space';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { SpaceAuthorizationService } from './space.service.authorization';
import { ISpace } from './space.interface';
import { CreateSubspaceInput } from './dto/space.dto.create.subspace';
import { SubspaceCreatedPayload } from './dto/space.subspace.created.payload';
import { SubscriptionType } from '@common/enums/subscription.type';
import { PubSubEngine } from 'graphql-subscriptions';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { NameReporterService } from '@services/external/elasticsearch/name-reporter/name.reporter.service';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { LogContext } from '@common/enums';
import { UpdateSpacePlatformSettingsInput } from './dto/space.dto.update.platform.settings';
import { SUBSCRIPTION_SUBSPACE_CREATED } from '@common/constants/providers';
import { UpdateSpaceSettingsInput } from './dto/space.dto.update.settings';

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
    @Args('settingsData') settingsData: UpdateSpaceSettingsInput
  ): Promise<ISpace> {
    const space = await this.spaceService.getSpaceOrFail(settingsData.spaceID, {
      relations: {
        account: {
          authorization: true,
        },
        parentSpace: {
          authorization: true,
        },
      },
    });
    if (!space.account || !space.account.authorization) {
      throw new EntityNotInitializedException(
        `Unabl to load authorization for account when updating settings on space: ${space.id}`,
        LogContext.SPACES
      );
    }

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      space.authorization,
      AuthorizationPrivilege.UPDATE,
      `space settings update: ${space.id}`
    );

    let updatedSpace = await this.spaceService.updateSpaceSettings(
      space,
      settingsData
    );

    // As the settings may update the authorization for the Space, the authorization policy will need to be reset
    updatedSpace =
      await this.spaceAuthorizationService.applyAuthorizationPolicy(
        updatedSpace
      );
    return await this.spaceService.save(updatedSpace);
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
    let space = await this.spaceService.getSpaceOrFail(updateData.spaceID);
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      space.authorization,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `update platform settings on space: ${space.id}`
    );

    space = await this.spaceService.updateSpacePlatformSettings(
      space,
      updateData
    );
    space =
      await this.spaceAuthorizationService.applyAuthorizationPolicy(space);
    return await this.spaceService.save(space);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ISpace, {
    description: 'Creates a new Subspace within the specified Space.',
  })
  @Profiling.api
  async createSubspace(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('subspaceData') subspaceData: CreateSubspaceInput
  ): Promise<ISpace> {
    const space = await this.spaceService.getSpaceOrFail(subspaceData.spaceID, {
      relations: {
        account: {
          agent: {
            credentials: true,
          },
        },
      },
    });
    if (
      !space.account ||
      !space.account.agent ||
      !space.account.agent.credentials
    ) {
      throw new EntityNotInitializedException(
        `Unabl to load agent with credentials for Account for Space: ${space.id}`,
        LogContext.SPACES
      );
    }
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      space.authorization,
      AuthorizationPrivilege.CREATE_SUBSPACE,
      `challengeCreate: ${space.nameID}`
    );

    // For the creation based on the template from another challenge require platform admin privileges
    if (subspaceData.collaborationData?.collaborationTemplateID) {
      this.authorizationService.grantAccessOrFail(
        agentInfo,
        space.authorization,
        AuthorizationPrivilege.CREATE,
        `challengeCreate using challenge template: ${space.nameID} - ${subspaceData.collaborationData.collaborationTemplateID}`
      );
    }
    let subspace = await this.spaceService.createSubspace(
      subspaceData,
      agentInfo
    );
    // Save here so can reuse it later without another load
    const displayName = subspace.profile.displayName;

    subspace =
      await this.spaceAuthorizationService.applyAuthorizationPolicy(subspace);
    subspace = await this.spaceService.save(subspace);

    this.activityAdapter.subspaceCreated({
      triggeredBy: agentInfo.userID,
      subspace,
    });

    this.contributionReporter.subspaceCreated(
      {
        id: subspace.id,
        name: displayName,
        space: space.id, //TODO: should this be a root space ID?
      },
      {
        id: agentInfo.userID,
        email: agentInfo.email,
      }
    );

    const subspaceCreatedEvent: SubspaceCreatedPayload = {
      eventID: `space-challenge-created-${Math.round(Math.random() * 100)}`,
      spaceID: space.id,
      subspace: subspace,
    };
    this.subspaceCreatedSubscription.publish(
      SubscriptionType.SUBSPACE_CREATED,
      subspaceCreatedEvent
    );

    return subspace;
  }
}
