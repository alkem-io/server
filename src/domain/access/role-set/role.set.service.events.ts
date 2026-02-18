import { LogContext } from '@common/enums';
import { ActorType } from '@common/enums/actor.type';
import { SpaceLevel } from '@common/enums/space.level';
import { RoleSetMembershipException } from '@common/exceptions/role.set.membership.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { IActor } from '@domain/actor/actor/actor.interface';
import { Injectable } from '@nestjs/common';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { ActivityInputMemberJoined } from '@services/adapters/activity-adapter/dto/activity.dto.input.member.joined';
import { NotificationInputCommunityNewMember } from '@services/adapters/notification-adapter/dto/space/notification.dto.input.space.community.new.member';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
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
    private activityAdapter: ActivityAdapter,
    private communityResolverService: CommunityResolverService
  ) {}

  public async registerCommunityNewMemberActivity(
    roleSet: IRoleSet,
    actorId: string,
    actorContext: ActorContext
  ) {
    const community =
      await this.communityResolverService.getCommunityForRoleSet(roleSet.id);

    const activityLogInput: ActivityInputMemberJoined = {
      triggeredBy: actorContext.actorId,
      community,
      contributor: { id: actorId } as IActor,
    };
    await this.activityAdapter.memberJoined(activityLogInput);
  }

  public async processCommunityNewMemberEvents(
    roleSet: IRoleSet,
    actorContext: ActorContext,
    actorId: string,
    actorType: ActorType
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
      actorId,
      triggeredBy: actorContext.actorId,
      actorType,
      community,
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
          { id: actorId, email: '' }
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
          { id: actorId, email: '' }
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
}
