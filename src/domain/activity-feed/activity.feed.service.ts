import { Injectable } from '@nestjs/common';
import { ActivityEventType } from '@common/enums/activity.event.type';
import { ActivityFeedRoles } from '@domain/activity-feed/activity.feed.roles.enum';

type ActivityFeedFilters = {
  types?: Array<ActivityEventType>;
  myActivity?: boolean; // todo name
  spaceIds?: Array<string>;
  roles?: Array<ActivityFeedRoles>;
};

@Injectable()
export class ActivityFeedService {
  public getActivityFeed(userId: string, filters: ActivityFeedFilters) {
    return [];
  }
}
