import { IActivity } from '@platform/activity';

// Map of collaboration IDs to parent space IDs
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
