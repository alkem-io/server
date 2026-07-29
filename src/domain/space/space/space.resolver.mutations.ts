import { GLOBAL_POLICY_SPACE_LEGACY_NAMEID_RENAME } from '@common/constants/authorization/global.policy.constants';
import { SUBSCRIPTION_SUBSPACE_CREATED } from '@common/constants/providers';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationRoleGlobal } from '@common/enums/authorization.credential.global';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { SubscriptionType } from '@common/enums/subscription.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
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
import { PlatformResourceAuditService } from '@src/platform-admin/platform-resource-audit/platform.resource.audit.service';
import { PubSubEngine } from 'graphql-subscriptions';
import { CreateSubspaceInput } from './dto/space.dto.create.subspace';
import { UpdateSpacePlatformSettingsInput } from './dto/space.dto.update.platform.settings';
import { UpdateSpaceSettingsInput } from './dto/space.dto.update.settings';
import { UpdateSubspacePinnedInput } from './dto/space.dto.update.subspace.pinned';
import { SubspaceCreatedPayload } from './dto/space.subspace.created.payload';
import { ISpace } from './space.interface';
import { SpaceService } from './space.service';
import { SpaceAuthorizationService } from './space.service.authorization';
import { SpaceLicenseService } from './space.service.license';

@InstrumentResolver()
@Resolver()
export class SpaceResolverMutations {
  /** corr-server-6 fix: `updateSpacePlatformSettings`'s `nameID` field is
   * additionally gated against THIS resolver-local, hardcoded
   * [GLOBAL_ADMIN, GLOBAL_SUPPORT] policy — the exact pre-existing legacy
   * reach — so re-anchoring the mutation's PRIMARY gate onto
   * ACCOUNT_LICENSE_MANAGE (T048/A14, additive to platform-license-manager
   * too) cannot silently hand entity renames to a role spec.md row 2 states
   * no global role reaches (A17, FR-020). */
  private legacySpaceNameIdRenamePolicy: IAuthorizationPolicy;

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
    private licenseService: LicenseService,
    private readonly platformResourceAuditService: PlatformResourceAuditService
  ) {
    this.legacySpaceNameIdRenamePolicy =
      this.authorizationPolicyService.createGlobalRolesAuthorizationPolicy(
        [
          AuthorizationRoleGlobal.GLOBAL_ADMIN,
          AuthorizationRoleGlobal.GLOBAL_SUPPORT,
        ],
        [AuthorizationPrivilege.ACCOUNT_LICENSE_MANAGE],
        GLOBAL_POLICY_SPACE_LEGACY_NAMEID_RENAME
      );
  }

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
      actorContext
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

    // 027-platform-role-redesign (T043, A8, research D5): dual-path — the
    // owning space keeps ordinary DELETE, platform-content-full-access
    // reaches the same mutation via its own privilege (cascaded from the
    // root policy, T036). Neither check alone is sufficient; either
    // satisfies the mutation.
    const canDeleteAsOwner = this.authorizationService.isAccessGranted(
      actorContext,
      space.authorization,
      AuthorizationPrivilege.DELETE
    );
    const canDeleteAsContentFullAccess =
      this.authorizationService.isAccessGranted(
        actorContext,
        space.authorization,
        AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS
      );
    if (!canDeleteAsOwner && !canDeleteAsContentFullAccess) {
      this.authorizationService.grantAccessOrFail(
        actorContext,
        space.authorization,
        AuthorizationPrivilege.DELETE,
        `deleteSpace: ${space.nameID}`
      );
    }
    const deletedSpaceId = space.id;
    const deleted = await this.spaceService.deleteSpaceOrFail(deleteData);
    // T058/FR-018a: audit ONLY on the PLATFORM branch — taken from the
    // authorization RESULT above, never re-derived from the actor's roles.
    if (canDeleteAsContentFullAccess) {
      await this.platformResourceAuditService.recordEventForActor(
        actorContext,
        [AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        {
          resourceKind: 'space',
          resourceId: deletedSpaceId,
          outcome: 'deleted',
        }
      );
    }
    return deleted;
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
    // 027-platform-role-redesign (T048, A14): re-anchored off PLATFORM_ADMIN
    // onto ACCOUNT_LICENSE_MANAGE (space.service.authorization.ts grants it
    // additively to platform-license-manager, alongside legacy
    // global-admin/global-support).
    this.authorizationService.grantAccessOrFail(
      actorContext,
      space.authorization,
      AuthorizationPrivilege.ACCOUNT_LICENSE_MANAGE,
      `update platform settings on space: ${space.id}`
    );

    // corr-server-6 fix: `nameID` (the space's URL path) is NOT part of the
    // ACCOUNT_LICENSE_MANAGE family the gate above admits — spec.md row 2
    // states no global role reaches entity renames (A17, FR-020), and
    // `platform-license-manager` must not gain it as a side effect of the
    // above gate's additive re-anchor. Additionally require the
    // pre-existing legacy reach (GLOBAL_ADMIN/GLOBAL_SUPPORT only) whenever
    // `nameID` is present.
    if (updateData.nameID !== undefined) {
      this.authorizationService.grantAccessOrFail(
        actorContext,
        this.legacySpaceNameIdRenamePolicy,
        AuthorizationPrivilege.ACCOUNT_LICENSE_MANAGE,
        `rename space (nameID) via platform settings: ${space.id}`
      );
    }

    const previousVisibility = space.visibility;
    space = await this.spaceService.updateSpacePlatformSettings(
      space,
      updateData
    );

    space = await this.spaceService.save(space);
    const updatedAuthorizations =
      await this.spaceAuthorizationService.applyAuthorizationPolicy(space.id);
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    // T058 — single-path surface (no owner branch): every successful call
    // is, by construction, authorized by ACCOUNT_LICENSE_MANAGE (A14).
    if (
      updateData.visibility !== undefined &&
      updateData.visibility !== previousVisibility
    ) {
      await this.platformResourceAuditService.recordEventForActor(
        actorContext,
        [AuthorizationCredential.PLATFORM_LICENSE_MANAGER],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        {
          resourceKind: 'space-visibility',
          resourceId: space.id,
          visibility: updateData.visibility,
          outcome: 'visibility_changed',
        }
      );
    }

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
      actorContext
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

  @Mutation(() => ISpace, {
    description:
      'Updates the pinned state of a Subspace within the specified Space. Returns the updated Subspace.',
  })
  async updateSubspacePinned(
    @CurrentActor() actorContext: ActorContext,
    @Args('pinnedData') pinnedData: UpdateSubspacePinnedInput
  ): Promise<ISpace> {
    const space = await this.spaceService.getSpaceOrFail(pinnedData.spaceID);

    this.authorizationService.grantAccessOrFail(
      actorContext,
      space.authorization,
      AuthorizationPrivilege.UPDATE,
      'update subspace pinned on space'
    );

    return this.spaceService.updateSubspacePinned(
      pinnedData.spaceID,
      pinnedData.subspaceID,
      pinnedData.pinned
    );
  }
}
