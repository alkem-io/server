import { SpaceMembershipCollaborationInfo } from '@services/api/me/space.membership.type';
import { IActivity } from './activity.interface';
import { ActivityEventType } from '@common/enums/activity.event.type';
import { createLatestActivityPerSpaceMap } from './create.latest.activity.per.space';

const AgentUserId = 'user1';
const OtherUserId = 'user2';

// Map<collaborationId, spaceId>, collaborationId can be from any type of journey
// we assign it the parent space id, if the collaboration id is of space, the space id assigned is its own
const spaceMembershipCollaborationInfoTestData: SpaceMembershipCollaborationInfo =
  new Map([
    ['space1-collaborationId', 'space1'],
    ['space2-collaborationId', 'space2'],
    ['space3-collaborationId', 'space3'],
    ['space4-collaborationId', 'space4'],
    ['space5-collaborationId', 'space5'],
    ['space1-challenge1-collaborationId', 'space1'],
    ['space1-challenge2-collaborationId', 'space1'],
    ['space1-challenge2-oppotunity1-collaborationId', 'space1'],
    ['space2-challenge1-collaborationId', 'space2'],
    ['space2-challenge2-collaborationId', 'space2'],
    ['space2-challenge2-oppotunity1-collaborationId', 'space2'],
  ]);

const createTestActivity = (
  createdDate: Date,
  triggeredBy: string,
  collaborationID: string
): IActivity => {
  return {
    id: '1',
    collaborationID,
    triggeredBy,
    createdDate,
    resourceID: '1',
    parentID: '1',
    messageID: '1',
    visibility: true,
    type: ActivityEventType.CALLOUT_WHITEBOARD_CREATED,
  };
};

describe('Test createLatestActivityPerSpaceMap function', () => {
  it('Latest agent user activity is correctly set from child journey', async () => {
    const Activity1 = createTestActivity(
      new Date('2021-01-01'),
      AgentUserId,
      'space1-collaborationId'
    );
    const Activity2 = createTestActivity(
      new Date('2021-01-02'),
      AgentUserId,
      'space1-challenge2-oppotunity1-collaborationId'
    );
    const Activity3 = createTestActivity(
      new Date('2021-01-03'),
      AgentUserId,
      'space1-challenge1-collaborationId'
    );
    const activities = [Activity1, Activity2, Activity3];
    const latestActivitiesPerSpace = createLatestActivityPerSpaceMap(
      activities,
      spaceMembershipCollaborationInfoTestData,
      AgentUserId
    );
    expect(latestActivitiesPerSpace.get('space1')?.mylatestActivity).toEqual(
      Activity3
    );
  });

  it('Latest other user activity is correctly set from child journey', async () => {
    const Activity1 = createTestActivity(
      new Date('2021-01-01'),
      OtherUserId,
      'space1-collaborationId'
    );
    const Activity2 = createTestActivity(
      new Date('2021-01-02'),
      OtherUserId,
      'space1-challenge2-oppotunity1-collaborationId'
    );
    const Activity3 = createTestActivity(
      new Date('2021-01-03'),
      OtherUserId,
      'space1-challenge1-collaborationId'
    );
    const activities = [Activity1, Activity2, Activity3];
    const latestActivitiesPerSpace = createLatestActivityPerSpaceMap(
      activities,
      spaceMembershipCollaborationInfoTestData,
      AgentUserId
    );
    expect(
      latestActivitiesPerSpace.get('space1')?.otherUsersLatestActivity
    ).toEqual(Activity3);
  });
  it('Both latest activities from agent user and other user are correctly set from child journey', async () => {
    const Activity1 = createTestActivity(
      new Date('2021-01-01'),
      OtherUserId,
      'space1-collaborationId'
    );
    const Activity2 = createTestActivity(
      new Date('2021-01-02'),
      OtherUserId,
      'space1-challenge2-oppotunity1-collaborationId'
    );
    const Activity3 = createTestActivity(
      new Date('2021-01-03'),
      OtherUserId,
      'space1-challenge1-collaborationId'
    );
    const Activity4 = createTestActivity(
      new Date('2021-01-01'),
      AgentUserId,
      'space1-collaborationId'
    );
    const Activity5 = createTestActivity(
      new Date('2021-01-02'),
      AgentUserId,
      'space1-challenge2-oppotunity1-collaborationId'
    );
    const Activity6 = createTestActivity(
      new Date('2021-01-03'),
      AgentUserId,
      'space1-challenge1-collaborationId'
    );
    const activities = [
      Activity1,
      Activity2,
      Activity3,
      Activity4,
      Activity5,
      Activity6,
    ];
    const latestActivitiesPerSpace = createLatestActivityPerSpaceMap(
      activities,
      spaceMembershipCollaborationInfoTestData,
      AgentUserId
    );
    expect(
      latestActivitiesPerSpace.get('space1')?.otherUsersLatestActivity
    ).toEqual(Activity3);
    //console.log(latestActivitiesPerSpace.get('space1')?.mylatestActivity);
    expect(latestActivitiesPerSpace.get('space1')?.mylatestActivity).toEqual(
      Activity6
    );
  });
});
