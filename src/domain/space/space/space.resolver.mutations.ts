import { SUBSCRIPTION_SUBSPACE_CREATED } from '@common/constants/providers';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { SubscriptionType } from '@common/enums/subscription.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LicenseService } from '@domain/common/license/license.service';
import {
  DeleteSpaceInput,
  UpdateSpaceInput,
  UpdateSubspacesSortOrderInput,
} from '@domain/space/space';
import { Inject } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { PubSubEngine } from 'graphql-subscriptions';
import { CreateSubspaceInput } from './dto/space.dto.create.subspace';
import { UpdateSpacePlatformSettingsInput } from './dto/space.dto.update.platform.settings';
import { UpdateSpaceSettingsInput } from './dto/space.dto.update.settings';
import { SubspaceCreatedPayload } from './dto/space.subspace.created.payload';
import { ISpace } from './space.interface';
import { SpaceService } from './space.service';
import { SpaceAuthorizationService } from './space.service.authorization';
import { SpaceLicenseService } from './space.service.license';

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

  @Mutation(() => ISpace, {
    description: 'Updates the Space.',
  })
  async updateSpace(
    @CurrentActor() actorContext: ActorContext,
    @Args('spaceData') spaceData: UpdateSpaceInput
  ): Promise<ISpace> {
    const space = await this.spaceService.getSpaceOrFail(spaceData.ID, {
      relations: {
        about: {
          profile: true,
        },
      },
    });
    await this.authorizationService.grantAccessOrFail(
      actorContext,
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
        id: actorContext.actorID,
        email: actorContext.actorID,
      }
    );

    return updatedSpace;
  }

  @Mutation(() => ISpace, {
    description: 'Deletes the specified Space.',
  })
  async deleteSpace(
    @CurrentActor() actorContext: ActorContext,
    @Args('deleteData') deleteData: DeleteSpaceInput
  ): Promise<ISpace> {
    const space = await this.spaceService.getSpaceOrFail(deleteData.ID);

    this.authorizationService.grantAccessOrFail(
      actorContext,
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
    @CurrentActor() actorContext: ActorContext,
    @Args('settingsData') settingsData: UpdateSpaceSettingsInput
  ): Promise<ISpace> {
    let space = await this.spaceService.getSpaceOrFail(settingsData.spaceID);

    this.authorizationService.grantAccessOrFail(
      actorContext,
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
    @CurrentActor() actorContext: ActorContext,
    @Args('updateData') updateData: UpdateSpacePlatformSettingsInput
  ): Promise<ISpace> {
    let space = await this.spaceService.getSpaceOrFail(updateData.spaceID, {
      relations: { about: { profile: true } },
    });
    this.authorizationService.grantAccessOrFail(
      actorContext,
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
    @CurrentActor() actorContext: ActorContext,
    @Args('subspaceData') subspaceData: CreateSubspaceInput
  ): Promise<ISpace> {
    const space = await this.spaceService.getSpaceOrFail(subspaceData.spaceID, {
      relations: {},
    });
    this.authorizationService.grantAccessOrFail(
      actorContext,
      space.authorization,
      AuthorizationPrivilege.CREATE_SUBSPACE,
      `subspace create in: ${space.id}`
    );

    const subspace = await this.spaceService.createSubspace(
      subspaceData,
      actorContext
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
      triggeredBy: actorContext.actorID,
      subspace,
    });

    this.contributionReporter.subspaceCreated(
      {
        id: subspace.id,
        name: displayName,
        space: space.id, //TODO: should this be a root space ID?
      },
      {
        id: actorContext.actorID,
        email: actorContext.actorID,
      }
    );

    const level0Space = await this.spaceService.getSpaceOrFail(
      subspace.levelZeroSpaceID,
      {
        relations: { credentials: true },
      }
    );

    const updatedLicenses = await this.spaceLicenseService.applyLicensePolicy(
      subspace.id,
      level0Space
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

  @Mutation(() => [ISpace], {
    description:
      'Update the sortOrder field of the supplied Subspaces to increase as per the order that they are provided in.',
  })
  async updateSubspacesSortOrder(
    @CurrentActor() actorContext: ActorContext,
    @Args('sortOrderData') sortOrderData: UpdateSubspacesSortOrderInput
  ): Promise<ISpace[]> {
    const space = await this.spaceService.getSpaceOrFail(sortOrderData.spaceID);

    this.authorizationService.grantAccessOrFail(
      actorContext,
      space.authorization,
      AuthorizationPrivilege.UPDATE,
      `update subspaces sort order on space: ${space.id}`
    );

    return this.spaceService.updateSubspacesSortOrder(space, sortOrderData);
  }
}
