import { LogContext } from '@common/enums';
import { ActorType } from '@common/enums/actor.type';
import { CommunityMembershipOrigin } from '@common/enums/community.membership.origin';
import { SpaceLevel } from '@common/enums/space.level';
import { RoleSetMembershipException } from '@common/exceptions/role.set.membership.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { IActor } from '@domain/actor/actor/actor.interface';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { ActivityInputMemberJoined } from '@services/adapters/activity-adapter/dto/activity.dto.input.member.joined';
import { NotificationInputCommunityNewMember } from '@services/adapters/notification-adapter/dto/space/notification.dto.input.space.community.new.member';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { NotificationOrganizationAdapter } from '@services/adapters/notification-adapter/notification.organization.adapter';
import { NotificationSpaceAdapter } from '@services/adapters/notification-adapter/notification.space.adapter';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { IRoleSet } from './role.set.interface';

@Injectable()
export class RoleSetEventsService {
  constructor(
    private contributionReporter: ContributionReporterService,
    private notificationAdapter: NotificationAdapter,
    private notificationAdapterSpace: NotificationSpaceAdapter,
    // forwardRef: NotificationOrganizationAdapter injects RoleSetService
    // (itself the direct injector of this service), so this edge must break
    // the cycle explicitly rather than relying on the other end alone.
    @Inject(forwardRef(() => NotificationOrganizationAdapter))
    private notificationAdapterOrganization: NotificationOrganizationAdapter,
    private activityAdapter: ActivityAdapter,
    private communityResolverService: CommunityResolverService,
    private organizationLookupService: OrganizationLookupService
  ) {}

  public async registerCommunityNewMemberActivity(
    roleSet: IRoleSet,
    actorID: string,
    actorContext: ActorContext
  ) {
    const community =
      await this.communityResolverService.getCommunityForRoleSet(roleSet.id);

    const activityLogInput: ActivityInputMemberJoined = {
      triggeredBy: actorContext.actorID,
      community,
      contributor: { id: actorID } as IActor,
    };
    await this.activityAdapter.memberJoined(activityLogInput);
  }

  public async processCommunityNewMemberEvents(
    roleSet: IRoleSet,
    actorContext: ActorContext,
    actorID: string,
    actorType: ActorType,
    membershipOrigin: CommunityMembershipOrigin = CommunityMembershipOrigin.DIRECT
  ) {
    const community =
      await this.communityResolverService.getCommunityForRoleSet(roleSet.id);
    const space = await this.communityResolverService.getSpaceForRoleSetOrFail(
      roleSet.id
    );
    const levelZeroSpaceID = space.levelZeroSpaceID;
    const communityDisplayName =
      await this.communityResolverService.getDisplayNameForRoleSetOrFail(
        roleSet.id
      );

    // Send the notification
    const notificationInput: NotificationInputCommunityNewMember = {
      actorID,
      triggeredBy: actorContext.actorID,
      actorType,
      community,
      membershipOrigin,
    };
    await this.notificationAdapterSpace.spaceCommunityNewMember(
      notificationInput
    );

    // Record the contribution events
    switch (space.level) {
      case SpaceLevel.L0: {
        this.contributionReporter.spaceJoined(
          {
            id: community.parentID,
            name: communityDisplayName,
            space: levelZeroSpaceID,
          },
          {
            actorID,
          }
        );
        break;
      }
      case SpaceLevel.L1:
      case SpaceLevel.L2: {
        this.contributionReporter.subspaceJoined(
          {
            id: community.parentID,
            name: communityDisplayName,
            space: levelZeroSpaceID,
          },
          {
            actorID,
          }
        );
        break;
      }
      default:
        throw new RoleSetMembershipException(
          `Invalid space level: ${space.level} on community ${community.id}`,
          LogContext.ROLES
        );
    }
  }

  /**
   * ORGANIZATION counterpart of {@link processCommunityNewMemberEvents} —
   * bounded to what organizations have (no room membership, no Space
   * activity/contribution reporting): only the "someone joined" admin
   * notification. `membershipOrigin` is threaded through to the adapter,
   * which is the single owner of the suppress-on-INVITATION rule (the
   * response notification is that origin's replacement, FR-010) so the
   * decision is not duplicated at this call site.
   */
  public async processOrganizationNewAssociateEvents(
    roleSet: IRoleSet,
    actorContext: ActorContext,
    actorID: string,
    membershipOrigin: CommunityMembershipOrigin
  ): Promise<void> {
    const organization =
      await this.organizationLookupService.getOrganizationForRoleSetOrFail(
        roleSet.id
      );
    await this.notificationAdapterOrganization.organizationAdminAssociateJoined(
      {
        triggeredBy: actorContext.actorID,
        organizationID: organization.id,
        associateID: actorID,
        membershipOrigin,
      }
    );
  }
}
