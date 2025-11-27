import { Inject } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { SpaceService } from './space.service';
import { DeleteSpaceInput, UpdateSpaceInput } from '@domain/space/space';
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
import { UpdateSpacePlatformSettingsInput } from './dto/space.dto.update.platform.settings';
import { SUBSCRIPTION_SUBSPACE_CREATED } from '@common/constants/providers';
import { UpdateSpaceSettingsInput } from './dto/space.dto.update.settings';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { SpaceLicenseService } from './space.service.license';
import { LicenseService } from '@domain/common/license/license.service';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class SpaceResolverMutations {
  constructor(
    private contributionReporter: ContributionReporterService,
    private activityAdapter: ActivityAdapter,
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private spaceService: SpaceService,
    private spaceAuthorizationService: SpaceAuthorizationService,
    @Inject(SUBSCRIPTION_SUBSPACE_CREATED)
    private subspaceCreatedSubscription: PubSubEngine,
    private spaceLicenseService: SpaceLicenseService,
    private licenseService: LicenseService
  ) {}
  // TODO: Remove this test mutation once remote evaluation is verified to be working
  @Mutation(() => String)
  async remoteTest(@CurrentUser() agentInfo: AgentInfo): Promise<string> {
    const space = await this.spaceService.getSpaceOrFail(
      '2a9d266c-acc5-4ea8-823e-f396b2be9524'
    );

    const result =
      await this.authorizationService.isAccessGrantedRemoteEvaluation(
        agentInfo.agentID,
        space.authorization!.id,
        AuthorizationPrivilege.READ
      );

    return JSON.stringify(result);
  }

  @Mutation(() => ISpace, {
    description: 'Updates the Space.',
  })
  async updateSpace(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('spaceData') spaceData: UpdateSpaceInput
  ): Promise<ISpace> {
    const space = await this.spaceService.getSpaceOrFail(spaceData.ID, {
      relations: {
        about: {
          profile: true,
        },
      },
    });

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      space.authorization,
      AuthorizationPrivilege.UPDATE,
      `update Space: ${space.id}`
    );

    const updatedSpace = await this.spaceService.update(spaceData);

    this.contributionReporter.spaceContentEdited(
      {
        id: updatedSpace.id,
        name: updatedSpace.about.profile.displayName,
        space: updatedSpace.id,
      },
      {
        id: agentInfo.userID,
        email: agentInfo.email,
      }
    );

    return updatedSpace;
  }

  @Mutation(() => ISpace, {
    description: 'Deletes the specified Space.',
  })
  async deleteSpace(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteSpaceInput
  ): Promise<ISpace> {
    const space = await this.spaceService.getSpaceOrFail(deleteData.ID);

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      space.authorization,
      AuthorizationPrivilege.DELETE,
      `deleteSpace: ${space.nameID}`
    );
    return await this.spaceService.deleteSpaceOrFail(deleteData);
  }

  @Mutation(() => ISpace, {
    description: 'Updates one of the Setting on a Space',
  })
  async updateSpaceSettings(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('settingsData') settingsData: UpdateSpaceSettingsInput
  ): Promise<ISpace> {
    let space = await this.spaceService.getSpaceOrFail(settingsData.spaceID);

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      space.authorization,
      AuthorizationPrivilege.UPDATE,
      `space settings update: ${space.id}`
    );

    const shouldUpdateAuthorization =
      await this.spaceService.shouldUpdateAuthorizationPolicy(
        space.id,
        settingsData.settings
      );

    space = await this.spaceService.updateSettings(
      space.id,
      settingsData.settings
    );
    // As the settings may update the authorization for the Space, the authorization policy will need to be reset
    // but not all settings will require this, so only update if necessary
    if (shouldUpdateAuthorization) {
      const updatedAuthorizations =
        await this.spaceAuthorizationService.applyAuthorizationPolicy(space.id);
      await this.authorizationPolicyService.saveAll(updatedAuthorizations);
    }

    return this.spaceService.getSpaceOrFail(space.id);
  }

  @Mutation(() => ISpace, {
    description:
      'Update the platform settings, such as nameID, of the specified Space.',
  })
  async updateSpacePlatformSettings(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('updateData') updateData: UpdateSpacePlatformSettingsInput
  ): Promise<ISpace> {
    let space = await this.spaceService.getSpaceOrFail(updateData.spaceID, {
      relations: { about: { profile: true } },
    });
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

    space = await this.spaceService.save(space);
    const updatedAuthorizations =
      await this.spaceAuthorizationService.applyAuthorizationPolicy(space.id);
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    return await this.spaceService.getSpaceOrFail(space.id);
  }

  @Mutation(() => ISpace, {
    description: 'Creates a new Subspace within the specified Space.',
  })
  async createSubspace(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('subspaceData') subspaceData: CreateSubspaceInput
  ): Promise<ISpace> {
    const space = await this.spaceService.getSpaceOrFail(subspaceData.spaceID, {
      relations: {},
    });
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      space.authorization,
      AuthorizationPrivilege.CREATE_SUBSPACE,
      `subspace create in: ${space.id}`
    );

    const subspace = await this.spaceService.createSubspace(
      subspaceData,
      agentInfo
    );
    // Save here so can reuse it later without another load
    const displayName = subspace.about.profile.displayName;
    const updatedAuthorizations =
      await this.spaceAuthorizationService.applyAuthorizationPolicy(
        subspace.id,
        space.authorization // Important, and will be stored
      );

    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

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

    const level0Space = await this.spaceService.getSpaceOrFail(
      subspace.levelZeroSpaceID,
      {
        relations: { agent: { credentials: true } },
      }
    );

    const updatedLicenses = await this.spaceLicenseService.applyLicensePolicy(
      subspace.id,
      level0Space.agent
    );
    await this.licenseService.saveAll(updatedLicenses);

    const newSubspace = await this.spaceService.getSpaceOrFail(subspace.id);

    const subspaceCreatedEvent: SubspaceCreatedPayload = {
      eventID: `space-challenge-created-${Math.round(Math.random() * 100)}`,
      spaceID: space.id,
      subspace: newSubspace,
    };
    this.subspaceCreatedSubscription.publish(
      SubscriptionType.SUBSPACE_CREATED,
      subspaceCreatedEvent
    );

    return newSubspace;
  }
}
