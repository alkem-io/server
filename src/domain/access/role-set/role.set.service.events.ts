import { Injectable } from '@nestjs/common';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { ActivityInputMemberJoined } from '@services/adapters/activity-adapter/dto/activity.dto.input.member.joined';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { IRoleSet } from './role.set.interface';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { SpaceLevel } from '@common/enums/space.level';
import { RoleSetMembershipException } from '@common/exceptions/role.set.membership.exception';
import { LogContext } from '@common/enums';
import { NotificationInputCommunityNewMember } from '@services/adapters/notification-adapter/dto/space/notification.dto.input.space.community.new.member';
import { NotificationSpaceAdapter } from '@services/adapters/notification-adapter/notification.space.adapter';
import { getContributorType } from '@domain/community/contributor/get.contributor.type';

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
    newContributor: IContributor,
    agentInfo: AgentInfo
  ) {
    const community =
      await this.communityResolverService.getCommunityForRoleSet(roleSet.id);

    const activityLogInput: ActivityInputMemberJoined = {
      triggeredBy: agentInfo.userID,
      community,
      contributor: newContributor,
    };
    await this.activityAdapter.memberJoined(activityLogInput);
  }

  public async processCommunityNewMemberEvents(
    roleSet: IRoleSet,
    agentInfo: AgentInfo,
    newContributor: IContributor
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
      contributorID: newContributor.id,
      triggeredBy: agentInfo.userID,
      contributorType: getContributorType(newContributor),
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
          {
            id: agentInfo.userID,
            email: agentInfo.email,
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
            id: agentInfo.userID,
            email: agentInfo.email,
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
}
