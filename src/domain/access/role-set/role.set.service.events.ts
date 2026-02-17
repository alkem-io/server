import { LogContext } from '@common/enums';
import { SpaceLevel } from '@common/enums/space.level';
import { RoleSetMembershipException } from '@common/exceptions/role.set.membership.exception';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import {
  getContributorType,
  isUser,
  isOrganization,
  isVirtualContributor,
} from '@domain/community/contributor/get.contributor.type';
import { Injectable } from '@nestjs/common';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { ActivityInputMemberJoined } from '@services/adapters/activity-adapter/dto/activity.dto.input.member.joined';
import { NotificationInputCommunityNewMember } from '@services/adapters/notification-adapter/dto/space/notification.dto.input.space.community.new.member';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { NotificationSpaceAdapter } from '@services/adapters/notification-adapter/notification.space.adapter';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { AuthorDetails } from '@services/external/elasticsearch/types';
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
    const joiningContributor =
      this.resolveAuthorDetailsFromContributor(newContributor);
    switch (space.level) {
      case SpaceLevel.L0: {
        this.contributionReporter.spaceJoined(
          {
            id: community.parentID,
            name: communityDisplayName,
            space: levelZeroSpaceID,
          },
          joiningContributor
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
          joiningContributor
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

  private resolveAuthorDetailsFromContributor(
    contributor: IContributor
  ): AuthorDetails {
    if (isUser(contributor)) {
      return {
        id: contributor.id,
        email: (contributor as any).email,
      };
    }

    if (isOrganization(contributor)) {
      return {
        id: contributor.id,
        email: (contributor as any).contactEmail ?? '',
      };
    }

    return {
      id: contributor.id,
      email: '',
    };
  }
}
