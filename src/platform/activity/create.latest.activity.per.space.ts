import {
  LatestActivitiesPerSpace,
  SpaceMembershipCollaborationInfo,
} from '@services/api/me/space.membership.type';
import { IActivity } from './activity.interface';

export const createLatestActivityPerSpaceMap = (
  activities: IActivity[],
  spaceMembershipCollaborationInfo: SpaceMembershipCollaborationInfo,
  triggeredBy: string
): LatestActivitiesPerSpace => {
  const latestActivityPerSpaceMap: LatestActivitiesPerSpace = new Map();

  const updateLatestActivityPerSpaceMap = (
    activity: IActivity,
    spaceID: string
  ) => {
    const latestActivities = latestActivityPerSpaceMap.get(spaceID);
    const isMyActivity = activity.triggeredBy === triggeredBy;

    if (!latestActivities) {
      const activitiesObject = {
        mylatestActivity: isMyActivity ? activity : undefined,
        otherUsersLatestActivity: isMyActivity ? undefined : activity,
      };
      latestActivityPerSpaceMap.set(spaceID, activitiesObject);
      return;
    }

    const existingActivity = isMyActivity
      ? latestActivities.mylatestActivity
      : latestActivities.otherUsersLatestActivity;

    if (
      !existingActivity ||
      activity.createdDate > existingActivity.createdDate
    ) {
      const activitiesObject = {
        mylatestActivity: isMyActivity
          ? activity
          : latestActivities.mylatestActivity,
        otherUsersLatestActivity: isMyActivity
          ? latestActivities.otherUsersLatestActivity
          : activity,
      };
      latestActivityPerSpaceMap.set(spaceID, activitiesObject);
    }
  };

  for (const activity of activities) {
    const parentSpaceID = spaceMembershipCollaborationInfo.get(
      activity.collaborationID
    );

    if (!parentSpaceID) {
      continue;
    }
    updateLatestActivityPerSpaceMap(activity, parentSpaceID);
  }

  return latestActivityPerSpaceMap;
};
