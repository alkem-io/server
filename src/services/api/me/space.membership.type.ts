import { IActivity } from '@platform/activity';

export type SpaceMembershipCollaborationInfo = Map<
  string, // collaborationId
  string // spaceId
>;

export type LatestActivitiesPerSpace = Map<
  string,
  {
    mylatestActivity: IActivity | undefined;
    otherUsersLatestActivity: IActivity | undefined;
  }
>;
