import { LatestActivitiesPerSpace } from '@services/api/me/space.membership.type';
import { ISpace } from './space.interface';

export const sortSpacesByActivity = (
  spacesData: ISpace[],
  latestActivitiesPerSpace: LatestActivitiesPerSpace
): ISpace[] => {
  const result = spacesData.sort((spaceA, spaceB) => {
    const spaceA_UserActivityTime = latestActivitiesPerSpace.get(spaceA.id)
      ?.mylatestActivity?.createdDate;
    const spaceA_OtherUsersActivityTime = latestActivitiesPerSpace.get(
      spaceA.id
    )?.otherUsersLatestActivity?.createdDate;
    const spaceB_UserActivityTime = latestActivitiesPerSpace.get(spaceB.id)
      ?.mylatestActivity?.createdDate;
    const spaceB_OtherUsersActivityTime = latestActivitiesPerSpace.get(
      spaceB.id
    )?.otherUsersLatestActivity?.createdDate;

    if (spaceA_UserActivityTime && spaceB_UserActivityTime) {
      // Both have user activity, compare them
      return (
        spaceB_UserActivityTime.getTime() - spaceA_UserActivityTime.getTime()
      );
    } else if (spaceA_UserActivityTime) {
      // Only spaceA_UserActivityTime is defined, so A comes first
      return -1;
    } else if (spaceB_UserActivityTime) {
      // Only spaceB_UserActivityTime is defined, so B comes first
      return 1;
    } else if (spaceA_OtherUsersActivityTime && spaceB_OtherUsersActivityTime) {
      // Both spaces have UserActivity undefined and both otherUsersActivityTime are defined, compare otherUsersActivityTime
      return (
        spaceB_OtherUsersActivityTime.getTime() -
        spaceA_OtherUsersActivityTime.getTime()
      );
    } else if (spaceA_OtherUsersActivityTime) {
      // Both spaces have UserActivity undefined and only spaceA_OtherUserActivityTime is defined, so a comes first
      return -1;
    } else if (spaceB_OtherUsersActivityTime) {
      // Both spaces have UserActivity undefined and only spaceB_OtherUserActivityTime is defined, so b comes first
      return 1;
    } else {
      // Both don't have activities, so they're equal
      return 0;
    }
  });

  return result;
};
