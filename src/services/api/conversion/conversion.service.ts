import { LogContext } from '@common/enums/logging.context';
import { RoleName } from '@common/enums/role.name';
import { SpaceLevel } from '@common/enums/space.level';
import { TemplateDefaultType } from '@common/enums/template.default.type';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { RoleSetAuthorizationService } from '@domain/access/role-set/role.set.service.authorization';
import { CalloutsSetService } from '@domain/collaboration/callouts-set/callouts.set.service';
import { InnovationFlowService } from '@domain/collaboration/innovation-flow/innovation.flow.service';
import { CreateInnovationFlowStateInput } from '@domain/collaboration/innovation-flow-state/dto';
import { IInnovationFlowState } from '@domain/collaboration/innovation-flow-state/innovation.flow.state.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ClassificationService } from '@domain/common/classification/classification.service';
import { SpaceMoveRoomsService } from '@domain/communication/space-move-rooms/space.move.rooms.service';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { IUser } from '@domain/community/user/user.interface';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { AccountHostService } from '@domain/space/account.host/account.host.service';
import { Space } from '@domain/space/space/space.entity';
import { ISpace } from '@domain/space/space/space.interface';
import { SpaceService } from '@domain/space/space/space.service';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { TemplateService } from '@domain/template/template/template.service';
import { TemplatesManagerService } from '@domain/template/templates-manager/templates.manager.service';
import { Inject, LoggerService } from '@nestjs/common';
import { PlatformService } from '@platform/platform/platform.service';
import { NotificationInputCommunityInvitation } from '@services/adapters/notification-adapter/dto/space/notification.dto.input.space.community.invitation';
import { NotificationUserAdapter } from '@services/adapters/notification-adapter/notification.user.adapter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { UrlGeneratorCacheService } from '@services/infrastructure/url-generator/url.generator.service.cache';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager } from 'typeorm';
import { InputCreatorService } from '../input-creator/input.creator.service';
import { ConvertSpaceL1ToSpaceL0Input } from './dto/convert.dto.space.l1.to.space.l0.input';
import { ConvertSpaceL1ToSpaceL2Input } from './dto/convert.dto.space.l1.to.space.l2.input';
import { ConvertSpaceL2ToSpaceL1Input } from './dto/convert.dto.space.l2.to.space.l1.input';
import { MoveSpaceL1ToSpaceL0Input } from './dto/move.dto.space.l1.to.space.l0.input';
import { MoveSpaceL1ToSpaceL2Input } from './dto/move.dto.space.l1.to.space.l2.input';

export class ConversionService {
  constructor(
    private spaceService: SpaceService,
    private namingService: NamingService,
    private roleSetService: RoleSetService,
    private platformService: PlatformService,
    private templateService: TemplateService,
    private templatesManagerService: TemplatesManagerService,
    private inputCreatorService: InputCreatorService,
    private innovationFlowService: InnovationFlowService,
    private accountHostService: AccountHostService,
    private spaceLookupService: SpaceLookupService,
    private classificationService: ClassificationService,
    private calloutsSetService: CalloutsSetService,
    private urlGeneratorCacheService: UrlGeneratorCacheService,
    private spaceMoveRoomsService: SpaceMoveRoomsService,
    private notificationUserAdapter: NotificationUserAdapter,
    private communityResolverService: CommunityResolverService,
    private roleSetAuthorizationService: RoleSetAuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private readonly entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async convertSpaceL1ToSpaceL0OrFail(
    conversionData: ConvertSpaceL1ToSpaceL0Input
  ): Promise<ISpace | never> {
    let spaceL1 = await this.spaceService.getSpaceOrFail(
      conversionData.spaceL1ID,
      {
        relations: {
          community: {
            roleSet: true,
          },
          collaboration: {
            innovationFlow: {
              states: true,
            },
          },
          storageAggregator: true,
          subspaces: true,
          parentSpace: true, // Needed to be able to unset it
        },
      }
    );
    if (
      !spaceL1.community ||
      !spaceL1.community.roleSet ||
      !spaceL1.collaboration ||
      !spaceL1.collaboration.innovationFlow ||
      !spaceL1.collaboration.innovationFlow.states ||
      !spaceL1.storageAggregator ||
      !spaceL1.subspaces
    ) {
      throw new EntityNotInitializedException(
        `Unable to locate all entities on on space L1: ${spaceL1.id}`,
        LogContext.CONVERSION
      );
    }
    const subspacesL1 = spaceL1.subspaces;
    const roleSetL1 = spaceL1.community.roleSet;
    // Space IS the Actor - spaceL1 itself is the actor
    const storageAggregatorL1 = spaceL1.storageAggregator;

    const spaceL0Orig = await this.spaceService.getSpaceOrFail(
      spaceL1.levelZeroSpaceID,
      {
        relations: {
          subspaces: true,
          account: {
            storageAggregator: true,
          },
        },
      }
    );
    if (
      !spaceL0Orig.account ||
      !spaceL0Orig.account.storageAggregator ||
      !spaceL0Orig.subspaces
    ) {
      throw new EntityNotInitializedException(
        `Unable to locate all entities on on space L0: ${spaceL0Orig.id}`,
        LogContext.CONVERSION
      );
    }

    // Need to get the containing account for the space
    const account = spaceL0Orig.account;
    const storageAggregatorAccount = spaceL0Orig.account.storageAggregator;

    // Remove the admins, so that also implicit subspace admin role is removed
    const userAdmins = await this.roleSetService.getUsersWithRole(
      roleSetL1,
      RoleName.ADMIN
    );
    for (const userAdmin of userAdmins) {
      await this.roleSetService.removeActorFromRole(
        roleSetL1,
        RoleName.ADMIN,
        userAdmin.id,
        false
      );
    }

    // Pending invitations / applications target the current space hierarchy;
    // after conversion they would resolve into a broken parent lookup
    // (alkem-io/server#5069), so drop them on this and every descendant.
    await this.roleSetService.removePendingInvitationsAndApplications(
      roleSetL1.id
    );
    const descendantSpaceIDsForL0Promotion =
      await this.spaceLookupService.getAllDescendantSpaceIDs(spaceL1.id);
    for (const descendantId of descendantSpaceIDsForL0Promotion) {
      const descendant = await this.spaceService.getSpaceOrFail(descendantId, {
        relations: { community: { roleSet: true } },
      });
      if (descendant.community?.roleSet) {
        await this.roleSetService.removePendingInvitationsAndApplications(
          descendant.community.roleSet.id
        );
      }
    }

    const reservedNameIDs =
      await this.namingService.getReservedNameIDsLevelZeroSpaces();
    const spaceL0NewNameID =
      this.namingService.createNameIdAvoidingReservedNameIDs(
        `${spaceL1.nameID}`,
        reservedNameIDs
      );

    spaceL1.level = SpaceLevel.L0;
    spaceL1.nameID = spaceL0NewNameID;
    spaceL1.levelZeroSpaceID = spaceL1.id;
    spaceL1.parentSpace = undefined; // Unfortunately this is not enough
    spaceL1.account = account;
    spaceL1.storageAggregator.parentStorageAggregator =
      storageAggregatorAccount;

    // Some fields on a Space L0 do not exist on Space L1 so we need to create them
    spaceL1.license = this.spaceService.createLicenseForSpaceL0();
    spaceL1.templatesManager =
      await this.spaceService.createTemplatesManagerForSpaceL0();

    // reset to default Space L0 innovation flow
    const resetInnovationFlowStates = await this.getInnovationFlowForSpaceL0();
    const newStatesInput: CreateInnovationFlowStateInput[] =
      this.inputCreatorService.buildCreateInnovationFlowStateInputFromInnovationFlowState(
        resetInnovationFlowStates
      );
    spaceL1.collaboration.innovationFlow =
      await this.innovationFlowService.updateInnovationFlowStates(
        spaceL1.collaboration.innovationFlow,
        newStatesInput
      );

    spaceL1 = await this.spaceService.save(spaceL1);

    // Ensure that the license plans for new spaces are applied
    await this.accountHostService.assignLicensePlansToSpace(
      spaceL1.id,
      account.accountType
    );
    // Need to do the roleset update after
    await this.roleSetService.removeParentRoleSet(roleSetL1.id);
    // and add back in the admins
    for (const userAdmin of userAdmins) {
      await this.roleSetService.assignActorToRole(
        roleSetL1,
        RoleName.ADMIN,
        userAdmin.id
      );
    }

    // And remove the space from the old space L0; note that setting to undefined is not enough, need to go through the parent space
    spaceL0Orig.subspaces = spaceL0Orig.subspaces.filter(
      subspace => subspace.id !== spaceL1.id
    );
    await this.spaceService.save(spaceL0Orig);

    // Now migrate all the child L2 spaces...note: this needs to go through a different path than the isolated conversion L2 to L1
    for (const spaceL2 of subspacesL1) {
      await this.updateChildSpaceL2ToL1(
        spaceL2.id,
        spaceL1,
        storageAggregatorL1,
        roleSetL1
      );
    }

    return spaceL1;
  }

  private async updateChildSpaceL2ToL1(
    spaceL2ID: string,
    spaceL0: ISpace,
    storageAggregatorL0: IStorageAggregator,
    roleSetL0: IRoleSet
  ): Promise<ISpace> {
    const spaceL2 = await this.spaceService.getSpaceOrFail(spaceL2ID, {
      relations: {
        storageAggregator: true,
        parentSpace: true,
        community: {
          roleSet: true,
        },
      },
    });
    if (
      !spaceL2.storageAggregator ||
      !spaceL2.parentSpace ||
      !spaceL2.community ||
      !spaceL2.community.roleSet
    ) {
      throw new EntityNotInitializedException(
        `Unable to locate all entities on on Space L2: ${spaceL2.id}`,
        LogContext.CONVERSION
      );
    }
    const roleSetL2 = spaceL2.community.roleSet;

    spaceL2.level = SpaceLevel.L1;
    spaceL2.parentSpace = spaceL0;
    spaceL2.levelZeroSpaceID = spaceL0.id;
    spaceL2.storageAggregator.parentStorageAggregator = storageAggregatorL0;
    spaceL2.community.roleSet =
      await this.roleSetService.setParentRoleSetAndCredentials(
        roleSetL2,
        roleSetL0
      );
    return await this.spaceService.save(spaceL2);
  }

  private async getInnovationFlowForSpaceL0(): Promise<IInnovationFlowState[]> {
    const platformTemplatesManager =
      await this.platformService.getTemplatesManagerOrFail();
    const levelZeroTemplate =
      await this.templatesManagerService.getTemplateFromTemplateDefault(
        platformTemplatesManager.id,
        TemplateDefaultType.PLATFORM_SPACE
      );
    const templateWithInnovationFlow =
      await this.templateService.getTemplateOrFail(levelZeroTemplate.id, {
        relations: {
          contentSpace: {
            collaboration: {
              innovationFlow: {
                states: true,
              },
            },
          },
        },
      });

    if (
      !templateWithInnovationFlow.contentSpace?.collaboration ||
      !templateWithInnovationFlow.contentSpace.collaboration.innovationFlow
    ) {
      throw new RelationshipNotFoundException(
        `Unable to retrieve Space L0 innovation flow template: ${levelZeroTemplate.id} is missing a relation`,
        LogContext.CONVERSION
      );
    }
    return templateWithInnovationFlow.contentSpace.collaboration.innovationFlow
      .states;
  }

  async convertSpaceL2ToSpaceL1OrFail(
    conversionData: ConvertSpaceL2ToSpaceL1Input
  ): Promise<ISpace | never> {
    let spaceL2 = await this.spaceService.getSpaceOrFail(
      conversionData.spaceL2ID,
      {
        relations: {
          community: {
            roleSet: true,
          },
        },
      }
    );
    if (!spaceL2.community) {
      throw new EntityNotInitializedException(
        `Unable to locate all entities on on Space L2: ${spaceL2.id}`,
        LogContext.CONVERSION
      );
    }
    const roleSetL2 = spaceL2.community.roleSet;

    const spaceL0 = await this.spaceService.getSpaceOrFail(
      spaceL2.levelZeroSpaceID,
      {
        relations: {
          storageAggregator: true,
          community: {
            roleSet: true,
          },
        },
      }
    );
    if (
      !spaceL0.storageAggregator ||
      !spaceL0.community ||
      !spaceL0.community.roleSet
    ) {
      throw new EntityNotInitializedException(
        `Conversion L2 to L1: Unable to locate all entities on on Space L0: ${spaceL0.id}`,
        LogContext.CONVERSION
      );
    }
    const storageAggregatorL0 = spaceL0.storageAggregator;
    const roleSetL0 = spaceL0.community.roleSet;

    // Remove the admins, so that also implicit subspace admin role is removed
    const userAdmins = await this.roleSetService.getUsersWithRole(
      roleSetL2,
      RoleName.ADMIN
    );
    for (const userAdmin of userAdmins) {
      await this.roleSetService.removeActorFromRole(
        roleSetL2,
        RoleName.ADMIN,
        userAdmin.id,
        false
      );
    }

    // Drop pending invitations/applications: targets the L2's current parent
    // chain, which is being rewritten (alkem-io/server#5069).
    await this.roleSetService.removePendingInvitationsAndApplications(
      roleSetL2.id
    );

    spaceL2 = await this.updateChildSpaceL2ToL1(
      spaceL2.id,
      spaceL0,
      storageAggregatorL0,
      roleSetL0
    );
    // and add back in the admins
    for (const userAdmin of userAdmins) {
      await this.roleSetService.assignActorToRole(
        roleSetL2,
        RoleName.ADMIN,
        userAdmin.id
      );
    }
    return await this.spaceService.getSpaceOrFail(spaceL2.id);
  }

  async convertSpaceL1ToSpaceL2OrFail(
    conversionData: ConvertSpaceL1ToSpaceL2Input
  ): Promise<ISpace | never> {
    let spaceL1 = await this.spaceService.getSpaceOrFail(
      conversionData.spaceL1ID,
      {
        relations: {
          community: {
            roleSet: true,
          },
          storageAggregator: true,
        },
      }
    );
    if (
      !spaceL1.community ||
      !spaceL1.community.roleSet ||
      !spaceL1.storageAggregator
    ) {
      throw new EntityNotInitializedException(
        `Unable to locate all entities on on Space L1: ${spaceL1.id}`,
        LogContext.CONVERSION
      );
    }
    const roleSetL1 = spaceL1.community.roleSet;

    const parentSpaceL1 = await this.spaceService.getSpaceOrFail(
      conversionData.parentSpaceL1ID,
      {
        relations: {
          storageAggregator: true,
          community: {
            roleSet: true,
          },
        },
      }
    );
    if (
      !parentSpaceL1.storageAggregator ||
      !parentSpaceL1.community ||
      !parentSpaceL1.community.roleSet
    ) {
      throw new EntityNotInitializedException(
        `Conversion L1 to L2: Unable to locate all entities on on parent Space L1: ${parentSpaceL1.id}`,
        LogContext.CONVERSION
      );
    }

    if (spaceL1.levelZeroSpaceID !== parentSpaceL1.levelZeroSpaceID) {
      throw new ValidationException(
        'Only can convert a L1 Space to be L2 within the same L0 Space',
        LogContext.CONVERSION
      );
    }
    const storageAggregatorParentL1 = parentSpaceL1.storageAggregator;
    const roleSetParentL1 = parentSpaceL1.community.roleSet;

    const spaceCommunityRoles = await this.getSpaceCommunityRoles(roleSetL1);
    await this.removeContributors(roleSetL1, spaceCommunityRoles);

    // Drop pending invitations/applications: targets the L1's existing
    // hierarchy, invalid once it becomes an L2 (alkem-io/server#5069).
    await this.roleSetService.removePendingInvitationsAndApplications(
      roleSetL1.id
    );

    spaceL1.level = SpaceLevel.L2;
    spaceL1.parentSpace = parentSpaceL1;
    spaceL1.storageAggregator.parentStorageAggregator =
      storageAggregatorParentL1;
    spaceL1.community.roleSet =
      await this.roleSetService.setParentRoleSetAndCredentials(
        roleSetL1,
        roleSetParentL1
      );

    spaceL1 = await this.spaceService.save(spaceL1);
    // and add back in the admins
    for (const userAdmin of spaceCommunityRoles.userAdmins) {
      await this.roleSetService.assignActorToRole(
        roleSetL1,
        RoleName.ADMIN,
        userAdmin.id
      );
    }
    return spaceL1;
  }

  private async getSpaceCommunityRoles(
    roleSet: IRoleSet
  ): Promise<SpaceCommunityRoles> {
    const userMembers = await this.roleSetService.getUsersWithRole(
      roleSet,
      RoleName.MEMBER
    );
    const userLeads = await this.roleSetService.getUsersWithRole(
      roleSet,
      RoleName.LEAD
    );
    const userAdmins = await this.roleSetService.getUsersWithRole(
      roleSet,
      RoleName.ADMIN
    );
    const orgMembers = await this.roleSetService.getOrganizationsWithRole(
      roleSet,
      RoleName.MEMBER
    );
    const orgLeads = await this.roleSetService.getOrganizationsWithRole(
      roleSet,
      RoleName.LEAD
    );

    const vcMembers = await this.roleSetService.getVirtualContributorsWithRole(
      roleSet,
      RoleName.MEMBER
    );
    return {
      userMembers,
      userLeads,
      userAdmins,
      orgMembers,
      orgLeads,
      vcMembers,
    };
  }

  // ── Cross-L0 Move: L1 → L0 (stays L1, changes parent L0) ──────────

  async moveSpaceL1ToSpaceL0OrFail(
    moveData: MoveSpaceL1ToSpaceL0Input
  ): Promise<MoveSpaceResult> {
    // 1. Load source L1
    const sourceL1 = await this.spaceService.getSpaceOrFail(
      moveData.spaceL1ID,
      {
        relations: {
          community: { roleSet: true },
          storageAggregator: true,
          subspaces: true,
        },
      }
    );
    if (
      !sourceL1.community?.roleSet ||
      !sourceL1.storageAggregator ||
      !sourceL1.subspaces
    ) {
      throw new EntityNotInitializedException(
        'Unable to locate all entities on source L1',
        LogContext.CONVERSION
      );
    }

    // 2. Load target L0
    const targetL0 = await this.spaceService.getSpaceOrFail(
      moveData.targetSpaceL0ID,
      {
        relations: {
          storageAggregator: true,
          community: { roleSet: true },
          subspaces: true,
          account: true,
        },
      }
    );
    if (
      !targetL0.storageAggregator ||
      !targetL0.community?.roleSet ||
      !targetL0.subspaces ||
      !targetL0.account
    ) {
      throw new EntityNotInitializedException(
        'Unable to locate all entities on target L0',
        LogContext.CONVERSION
      );
    }

    // 3. Validate
    if (sourceL1.level !== SpaceLevel.L1) {
      throw new ValidationException(
        'Only L1 spaces can be moved cross-L0',
        LogContext.CONVERSION
      );
    }
    if (targetL0.level !== SpaceLevel.L0) {
      throw new ValidationException(
        'Target must be an L0 space',
        LogContext.CONVERSION
      );
    }
    if (sourceL1.levelZeroSpaceID === targetL0.id) {
      throw new ValidationException(
        'Cannot move space to its current parent L0',
        LogContext.CONVERSION
      );
    }

    // 4. Validate nameIDs
    await this.validateNameIDsInTargetL0Scope(sourceL1.id, targetL0.id);

    // 5. Collect community roles and actor IDs (root L1)
    const roleSetL1 = sourceL1.community.roleSet;
    const spaceCommunityRoles = await this.getSpaceCommunityRoles(roleSetL1);
    const removedActorIds = this.collectRemovedActorIds(
      spaceCommunityRoles,
      true
    );

    // 5b. Also collect and clear descendant L2 community roles
    const descendantSpaceIds =
      await this.spaceLookupService.getAllDescendantSpaceIDs(sourceL1.id);
    for (const descId of descendantSpaceIds) {
      const descSpace = await this.spaceService.getSpaceOrFail(descId, {
        relations: { community: { roleSet: true } },
      });
      if (!descSpace.community?.roleSet) continue;
      const descRoles = await this.getSpaceCommunityRoles(
        descSpace.community.roleSet
      );
      const descActorIds = this.collectRemovedActorIds(descRoles, true);
      removedActorIds.push(...descActorIds);
      await this.removeContributors(descSpace.community.roleSet, descRoles);
      for (const userAdmin of descRoles.userAdmins) {
        await this.roleSetService.removeActorFromRole(
          descSpace.community.roleSet,
          RoleName.ADMIN,
          userAdmin.id,
          false
        );
      }
    }
    // Deduplicate — actors may appear across multiple levels
    const uniqueRemovedActorIds = [...new Set(removedActorIds)];

    // 6-7. Clear ALL community roles including admins (root L1)
    await this.removeContributors(roleSetL1, spaceCommunityRoles);
    for (const userAdmin of spaceCommunityRoles.userAdmins) {
      await this.roleSetService.removeActorFromRole(
        roleSetL1,
        RoleName.ADMIN,
        userAdmin.id,
        false
      );
    }

    // 7b. Drop pending invitations/applications across the moved subtree —
    // current invites resolve against the source L0's hierarchy
    // (alkem-io/server#5069).
    await this.roleSetService.removePendingInvitationsAndApplications(
      roleSetL1.id
    );
    for (const descId of descendantSpaceIds) {
      const descSpace = await this.spaceService.getSpaceOrFail(descId, {
        relations: { community: { roleSet: true } },
      });
      if (descSpace.community?.roleSet) {
        await this.roleSetService.removePendingInvitationsAndApplications(
          descSpace.community.roleSet.id
        );
      }
    }

    // 8. Update structural fields
    sourceL1.parentSpace = targetL0;
    sourceL1.levelZeroSpaceID = targetL0.id;

    // 9. Bulk update descendant levelZeroSpaceIDs (reuse IDs from step 5b)
    if (descendantSpaceIds.length > 0) {
      await this.entityManager
        .createQueryBuilder()
        .update(Space)
        .set({ levelZeroSpaceID: targetL0.id })
        .whereInIds(descendantSpaceIds)
        .execute();
    }

    // 10. Update storage aggregator parent
    sourceL1.storageAggregator.parentStorageAggregator =
      targetL0.storageAggregator;

    // 11. Update roleSet parent
    sourceL1.community.roleSet =
      await this.roleSetService.setParentRoleSetAndCredentials(
        roleSetL1,
        targetL0.community.roleSet
      );

    // 12. Sync innovation flow tagsets
    await this.syncInnovationFlowTagsetsForSubtree(sourceL1.id, targetL0.id);

    // 13. Update sort order: insert at first position, shift existing children
    await this.entityManager
      .createQueryBuilder()
      .update(Space)
      .set({ sortOrder: () => '"sortOrder" + 1' })
      .where('"parentSpaceId" = :parentId', { parentId: targetL0.id })
      .execute();
    sourceL1.sortOrder = 0;

    // 14. Save and propagate license entitlements
    const savedSpace = await this.spaceService.save(sourceL1);
    await this.accountHostService.assignLicensePlansToSpace(
      savedSpace.id,
      targetL0.account.accountType
    );

    return { space: savedSpace, removedActorIds: uniqueRemovedActorIds };
  }

  // ── Cross-L0 Move: L1 → L2 (demoted, changes parent L0) ──────────

  async moveSpaceL1ToSpaceL2OrFail(
    moveData: MoveSpaceL1ToSpaceL2Input
  ): Promise<MoveSpaceResult> {
    // 1. Load source L1
    const sourceL1 = await this.spaceService.getSpaceOrFail(
      moveData.spaceL1ID,
      {
        relations: {
          community: { roleSet: true },
          storageAggregator: true,
          subspaces: true,
        },
      }
    );
    if (
      !sourceL1.community?.roleSet ||
      !sourceL1.storageAggregator ||
      !sourceL1.subspaces
    ) {
      throw new EntityNotInitializedException(
        'Unable to locate all entities on source L1',
        LogContext.CONVERSION
      );
    }

    // 2. Load target L1
    const targetL1 = await this.spaceService.getSpaceOrFail(
      moveData.targetSpaceL1ID,
      {
        relations: {
          storageAggregator: true,
          community: { roleSet: true },
          subspaces: true,
        },
      }
    );
    if (
      !targetL1.storageAggregator ||
      !targetL1.community?.roleSet ||
      !targetL1.subspaces
    ) {
      throw new EntityNotInitializedException(
        'Unable to locate all entities on target L1',
        LogContext.CONVERSION
      );
    }

    // 3. Load target L0
    const targetL0 = await this.spaceService.getSpaceOrFail(
      targetL1.levelZeroSpaceID,
      {
        relations: { account: true },
      }
    );
    if (!targetL0.account) {
      throw new EntityNotInitializedException(
        'Unable to locate account on target L0',
        LogContext.CONVERSION
      );
    }

    // 4. Validate
    if (sourceL1.level !== SpaceLevel.L1) {
      throw new ValidationException(
        'Only L1 spaces can be moved cross-L0',
        LogContext.CONVERSION
      );
    }
    if (targetL1.level !== SpaceLevel.L1) {
      throw new ValidationException(
        'Target must be an L1 space',
        LogContext.CONVERSION
      );
    }
    if (sourceL1.levelZeroSpaceID === targetL1.levelZeroSpaceID) {
      throw new ValidationException(
        'Source and target are in the same L0; use convertSpaceL1ToSpaceL2 instead',
        LogContext.CONVERSION
      );
    }

    // 5. Validate depth — source must have no L2 children
    if (sourceL1.subspaces.length > 0) {
      throw new ValidationException(
        'Cannot demote: source L1 has L2 children that would exceed max nesting depth',
        LogContext.CONVERSION
      );
    }

    // 6. Validate nameIDs
    await this.validateNameIDsInTargetL0Scope(sourceL1.id, targetL0.id);

    // 7. Collect community roles and actor IDs (ALL cleared for cross-L0)
    const roleSetL1 = sourceL1.community.roleSet;
    const spaceCommunityRoles = await this.getSpaceCommunityRoles(roleSetL1);
    const removedActorIds = this.collectRemovedActorIds(
      spaceCommunityRoles,
      true
    );

    // 8. Clear ALL community roles including admins
    await this.removeContributors(roleSetL1, spaceCommunityRoles);
    for (const userAdmin of spaceCommunityRoles.userAdmins) {
      await this.roleSetService.removeActorFromRole(
        roleSetL1,
        RoleName.ADMIN,
        userAdmin.id,
        false
      );
    }

    // 8b. Drop pending invitations/applications — current invites point at
    // the source L0's hierarchy (alkem-io/server#5069).
    await this.roleSetService.removePendingInvitationsAndApplications(
      roleSetL1.id
    );

    // 9. Update structural fields — demote to L2
    sourceL1.level = SpaceLevel.L2;
    sourceL1.parentSpace = targetL1;
    sourceL1.levelZeroSpaceID = targetL0.id;

    // 10. Update storage aggregator parent (points to target L1)
    sourceL1.storageAggregator.parentStorageAggregator =
      targetL1.storageAggregator;

    // 11. Update roleSet parent (points to target L1's roleSet)
    sourceL1.community.roleSet =
      await this.roleSetService.setParentRoleSetAndCredentials(
        roleSetL1,
        targetL1.community.roleSet
      );

    // 12. Sync innovation flow tagsets
    await this.syncInnovationFlowTagsetsForSubtree(sourceL1.id, targetL0.id);

    // 13. Update sort order: insert at first position, shift existing children
    await this.entityManager
      .createQueryBuilder()
      .update(Space)
      .set({ sortOrder: () => '"sortOrder" + 1' })
      .where('"parentSpaceId" = :parentId', { parentId: targetL1.id })
      .execute();
    sourceL1.sortOrder = 0;

    // 14. Save and propagate license entitlements
    const savedSpace = await this.spaceService.save(sourceL1);
    await this.accountHostService.assignLicensePlansToSpace(
      savedSpace.id,
      targetL0.account.accountType
    );

    return { space: savedSpace, removedActorIds };
  }

  // ── Cross-L0 Move Helpers ─────────────────────────────────────────

  /**
   * Validates that no space nameID in the moved subtree collides with
   * existing space nameIDs scoped to the target L0.
   */
  private async validateNameIDsInTargetL0Scope(
    movedSpaceId: string,
    targetL0Id: string
  ): Promise<void> {
    const reservedNameIDs =
      await this.namingService.getReservedNameIDsInLevelZeroSpace(targetL0Id);

    // Collect moved subtree nameIDs (source + L2 children)
    const movedSpaces = await this.entityManager.find(Space, {
      where: [{ id: movedSpaceId }, { parentSpace: { id: movedSpaceId } }],
      select: { id: true, nameID: true },
    });

    for (const space of movedSpaces) {
      if (reservedNameIDs.includes(space.nameID)) {
        throw new ValidationException(
          'NameID collision in target L0 scope',
          LogContext.CONVERSION,
          { conflictingNameID: space.nameID }
        );
      }
    }
  }

  /**
   * Syncs callout classification tagsets in the entire moved subtree.
   * Each space's callouts are synced using that space's OWN calloutsSet
   * tagsetTemplate — not the target L0's — because L1/L2 spaces retain their
   * own innovation flow after a cross-L0 move.
   */
  private async syncInnovationFlowTagsetsForSubtree(
    movedSpaceId: string,
    _targetL0Id: string
  ): Promise<void> {
    const descendantIds =
      await this.spaceLookupService.getAllDescendantSpaceIDs(movedSpaceId);
    const allSpaceIds = [movedSpaceId, ...descendantIds];

    for (const spaceId of allSpaceIds) {
      const space = await this.spaceService.getSpaceOrFail(spaceId, {
        relations: {
          collaboration: {
            calloutsSet: {
              callouts: {
                classification: true,
              },
            },
          },
        },
      });

      const calloutsSet = space.collaboration?.calloutsSet;
      if (!calloutsSet) continue;

      const tagsetTemplateSet =
        await this.calloutsSetService.getTagsetTemplatesSet(calloutsSet.id);
      const tagsetTemplates = tagsetTemplateSet.tagsetTemplates;
      if (!tagsetTemplates || tagsetTemplates.length === 0) continue;

      const callouts = calloutsSet.callouts;
      if (!callouts) continue;

      for (const callout of callouts) {
        if (!callout.classification) continue;
        for (const tagsetTemplate of tagsetTemplates) {
          await this.classificationService.updateTagsetTemplateOnSelectTagset(
            callout.classification.id,
            tagsetTemplate
          );
        }
      }
    }
  }

  /**
   * Collects all actor IDs from the community roles object.
   * When includeAdmins is true (cross-L0), admin IDs are included.
   */
  private collectRemovedActorIds(
    spaceCommunityRoles: SpaceCommunityRoles,
    includeAdmins: boolean
  ): string[] {
    const ids: string[] = [];
    for (const u of spaceCommunityRoles.userMembers) ids.push(u.id);
    for (const u of spaceCommunityRoles.userLeads) ids.push(u.id);
    if (includeAdmins) {
      for (const u of spaceCommunityRoles.userAdmins) ids.push(u.id);
    }
    for (const o of spaceCommunityRoles.orgMembers) ids.push(o.id);
    for (const o of spaceCommunityRoles.orgLeads) ids.push(o.id);
    for (const vc of spaceCommunityRoles.vcMembers) ids.push(vc.id);
    // Deduplicate — an actor can appear in multiple roles
    return [...new Set(ids)];
  }

  /**
   * Dispatches auto-invite invitations to former community members who are
   * also members of the target L0 community (the overlap set).
   * Best-effort: logs errors, never throws (FR-036).
   */
  async dispatchAutoInvitesAfterMove(
    removedActorIds: string[],
    targetL0Id: string,
    movedSpaceId: string,
    createdBy: string,
    invitationMessage?: string
  ): Promise<void> {
    try {
      // 1. Load target L0 community members (user IDs only)
      const targetL0 = await this.spaceService.getSpaceOrFail(targetL0Id, {
        relations: { community: { roleSet: true } },
      });
      if (!targetL0.community?.roleSet) return;

      const targetRoles = await this.getSpaceCommunityRoles(
        targetL0.community.roleSet
      );
      const targetL0MemberIds = new Set(targetRoles.userMembers.map(u => u.id));

      // 2. Compute overlap: former members ∩ target L0 members
      const overlapUserIds = removedActorIds.filter(id =>
        targetL0MemberIds.has(id)
      );
      if (overlapUserIds.length === 0) return;

      // 3. Load moved space to get its roleSet ID
      const movedSpace = await this.spaceService.getSpaceOrFail(movedSpaceId, {
        relations: { community: { roleSet: true } },
      });
      if (!movedSpace.community?.roleSet) return;

      const roleSet = movedSpace.community.roleSet;
      const roleSetID = roleSet.id;

      // 4. Resolve community for notification payloads
      const community =
        await this.communityResolverService.getCommunityForRoleSet(roleSetID);

      // 5. Create invitations and send notifications for each overlap user
      for (const userId of overlapUserIds) {
        try {
          const invitation =
            await this.roleSetService.createInvitationExistingActor({
              invitedActorID: userId,
              welcomeMessage: invitationMessage,
              createdBy,
              roleSetID,
              invitedToParent: false,
              extraRoles: [],
            });

          const notificationInput: NotificationInputCommunityInvitation = {
            triggeredBy: createdBy,
            community,
            invitationID: invitation.id,
            invitedContributorID: userId,
            welcomeMessage: invitationMessage,
          };
          this.notificationUserAdapter
            .userSpaceCommunityInvitationCreated(notificationInput)
            .catch(error =>
              this.logger.error(
                `Failed to send invitation notification for user ${userId}`,
                (error as Error)?.stack ?? '',
                LogContext.CONVERSION
              )
            );
        } catch (err) {
          this.logger.error(
            `Failed to create auto-invite for user after move`,
            (err as Error)?.stack ?? '',
            LogContext.CONVERSION
          );
        }
      }

      // 6. Apply authorization policies on newly created invitations
      // Without this, invitations have bare AuthorizationPolicy with no credential rules
      await this.resetAuthorizationsOnRoleSetInvitations(roleSetID);
    } catch (err) {
      this.logger.error(
        `Failed to dispatch auto-invites after move`,
        (err as Error)?.stack ?? '',
        LogContext.CONVERSION
      );
    }
  }

  private async resetAuthorizationsOnRoleSetInvitations(
    roleSetID: string
  ): Promise<void> {
    const roleSet = await this.roleSetService.getRoleSetOrFail(roleSetID, {
      relations: {
        invitations: true,
        platformInvitations: true,
        applications: true,
      },
    });
    const authorizations =
      await this.roleSetAuthorizationService.applyAuthorizationPolicyOnInvitationsApplications(
        roleSet
      );
    await this.authorizationPolicyService.saveAll(authorizations);
  }

  /**
   * Invalidates URL caches for all space profiles in the moved subtree.
   */
  async invalidateUrlCachesForSubtree(movedSpaceId: string): Promise<void> {
    const descendantIds =
      await this.spaceLookupService.getAllDescendantSpaceIDs(movedSpaceId);
    const allSpaceIds = [movedSpaceId, ...descendantIds];

    for (const spaceId of allSpaceIds) {
      const space = await this.spaceService.getSpaceOrFail(spaceId, {
        relations: { about: { profile: true } },
      });
      if (space.about?.profile?.id) {
        await this.urlGeneratorCacheService.revokeUrlCache(
          space.about.profile.id
        );
      }
    }
  }

  get moveRoomsService(): SpaceMoveRoomsService {
    return this.spaceMoveRoomsService;
  }

  private async removeContributors(
    roleSet: IRoleSet,
    spaceCommunityRoles: SpaceCommunityRoles
  ) {
    const validatePolicyLimits = false;
    for (const userMember of spaceCommunityRoles.userMembers) {
      await this.roleSetService.removeActorFromRole(
        roleSet,
        RoleName.MEMBER,
        userMember.id,
        validatePolicyLimits
      );
    }
    for (const userLead of spaceCommunityRoles.userLeads) {
      await this.roleSetService.removeActorFromRole(
        roleSet,
        RoleName.LEAD,
        userLead.id,
        validatePolicyLimits
      );
    }
    for (const orgMember of spaceCommunityRoles.orgMembers) {
      await this.roleSetService.removeActorFromRole(
        roleSet,
        RoleName.MEMBER,
        orgMember.id,
        validatePolicyLimits
      );
    }
    for (const orgLead of spaceCommunityRoles.orgLeads) {
      await this.roleSetService.removeActorFromRole(
        roleSet,
        RoleName.LEAD,
        orgLead.id,
        validatePolicyLimits
      );
    }
    for (const vcMember of spaceCommunityRoles.vcMembers) {
      await this.roleSetService.removeActorFromRole(
        roleSet,
        RoleName.MEMBER,
        vcMember.id,
        validatePolicyLimits
      );
    }
  }
}

type MoveSpaceResult = {
  space: ISpace;
  removedActorIds: string[];
};

// Create a new type for usage in this service that has fields for user members + leads, org members + leads etc
type SpaceCommunityRoles = {
  userMembers: IUser[];
  userLeads: IUser[];
  userAdmins: IUser[];
  orgMembers: IOrganization[];
  orgLeads: IOrganization[];
  vcMembers: IVirtualContributor[];
};
