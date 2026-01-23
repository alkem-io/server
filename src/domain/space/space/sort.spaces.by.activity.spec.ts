import { ActivityEventType } from '@common/enums/activity.event.type';
import { IActivity } from '@platform/activity/activity.interface';
import { LatestActivitiesPerSpace } from '@services/api/me/space.membership.type';
import { ISpace } from './space.interface';
import { sortSpacesByActivity } from './sort.spaces.by.activity';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { ProfileType } from '@common/enums';
import { AccountType } from '@common/enums/account.type';
import { CommunityMembershipPolicy } from '@common/enums/community.membership.policy';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { DEFAULT_BASELINE_ACCOUNT_LICENSE_PLAN } from '../account/constants';

const createTestActivity = (createdDate: Date): IActivity => {
  return {
    id: '1',
    collaborationID: '1',
    triggeredBy: 'user1',
    createdDate,
    resourceID: '1',
    parentID: '1',
    messageID: '1',
    visibility: true,
    updatedDate: new Date(),
    type: ActivityEventType.CALLOUT_WHITEBOARD_CREATED,
  };
};

const spaceSettings = {
  privacy: {
    mode: SpacePrivacyMode.PUBLIC,
    allowPlatformSupportAsAdmin: false,
  },
  membership: {
    policy: CommunityMembershipPolicy.OPEN,
    trustedOrganizations: [],
    allowSubspaceAdminsToInviteMembers: false,
  },
  collaboration: {
    inheritMembershipRights: true,
    allowMembersToCreateSubspaces: true,
    allowMembersToCreateCallouts: true,
    allowEventsFromSubspaces: true,
    allowMembersToVideoCall: false,
    allowGuestContributions: false,
  },
};

const createTestSpace = (id: string): ISpace => {
  return {
    id,
    rowId: 1,
    nameID: 'space1',
    settings: spaceSettings,
    levelZeroSpaceID: '',
    visibility: SpaceVisibility.ACTIVE,
    platformRolesAccess: {
      roles: [],
    },
    sortOrder: 0,
    createdDate: new Date(),
    updatedDate: new Date(),
    about: {
      id: '1',
      profile: {
        id: '1',
        displayName: 'Space 1',
        description: '',
        tagline: '',
        type: ProfileType.SPACE_ABOUT,
        createdDate: new Date(),
        updatedDate: new Date(),
      },
      createdDate: new Date(),
      updatedDate: new Date(),
    },
    account: {
      id: `account${id}`,
      virtualContributors: [],
      innovationHubs: [],
      innovationPacks: [],
      externalSubscriptionID: '',
      spaces: [],
      type: AccountType.ORGANIZATION,
      baselineLicensePlan: DEFAULT_BASELINE_ACCOUNT_LICENSE_PLAN,
      createdDate: new Date(),
      updatedDate: new Date(),
    },
    level: 0,
  };
};

const Space1 = createTestSpace('1');
const Space2 = createTestSpace('2');
const Space3 = createTestSpace('3');
const Space4 = createTestSpace('4');
const Space5 = createTestSpace('5');

const spaces = [Space1, Space2, Space3, Space4, Space5];

const Activity1 = createTestActivity(new Date('2021-01-01'));
const Activity2 = createTestActivity(new Date('2021-01-02'));
const Activity3 = createTestActivity(new Date('2021-01-03'));
const Activity4 = createTestActivity(new Date('2021-01-04'));
const Activity5 = createTestActivity(new Date('2021-01-05'));
// const Activity6 = createTestActivity(new Date('2021-01-06'));
const Activity7 = createTestActivity(new Date('2021-01-07'));
const Activity10 = createTestActivity(new Date('2021-01-10'));

const spaceMembershipLatestActivitiesTestData1: LatestActivitiesPerSpace =
  new Map([
    ['1', { mylatestActivity: Activity1, otherUsersLatestActivity: undefined }],
    ['2', { mylatestActivity: Activity2, otherUsersLatestActivity: undefined }],
    ['3', { mylatestActivity: Activity3, otherUsersLatestActivity: undefined }],
    ['4', { mylatestActivity: Activity4, otherUsersLatestActivity: undefined }],
    ['5', { mylatestActivity: Activity5, otherUsersLatestActivity: undefined }],
  ]);

const TestData1_result: string[] = ['5', '4', '3', '2', '1'];

const spaceMembershipLatestActivitiesTestData2: LatestActivitiesPerSpace =
  new Map([
    ['1', { mylatestActivity: Activity1, otherUsersLatestActivity: undefined }],
    ['2', { mylatestActivity: Activity2, otherUsersLatestActivity: undefined }],
    ['3', { mylatestActivity: Activity3, otherUsersLatestActivity: undefined }],
    ['4', { mylatestActivity: Activity4, otherUsersLatestActivity: undefined }],
    ['5', { mylatestActivity: undefined, otherUsersLatestActivity: undefined }],
  ]);

const TestData2_result: string[] = ['4', '3', '2', '1', '5'];

const spaceMembershipLatestActivitiesTestData3: LatestActivitiesPerSpace =
  new Map([
    ['1', { mylatestActivity: Activity4, otherUsersLatestActivity: undefined }],
    ['2', { mylatestActivity: Activity7, otherUsersLatestActivity: undefined }],
    [
      '3',
      { mylatestActivity: Activity5, otherUsersLatestActivity: Activity10 },
    ],
    ['4', { mylatestActivity: undefined, otherUsersLatestActivity: Activity2 }],
    ['5', { mylatestActivity: undefined, otherUsersLatestActivity: Activity1 }],
  ]);

const TestData3_result: string[] = ['2', '3', '1', '4', '5'];

describe('Test sortSpacesByActivity function', () => {
  it('TestData1', async () => {
    const sortedSpaces = sortSpacesByActivity(
      spaces,
      spaceMembershipLatestActivitiesTestData1
    );
    const result = sortedSpaces.map(space => space.id);
    expect(result).toEqual(TestData1_result);
  });

  it('TestData2', async () => {
    const sortedSpaces = sortSpacesByActivity(
      spaces,
      spaceMembershipLatestActivitiesTestData2
    );

    const result = sortedSpaces.map(space => space.id);
    expect(result).toEqual(TestData2_result);
  });

  it('TestData3', async () => {
    const sortedSpaces = sortSpacesByActivity(
      spaces,
      spaceMembershipLatestActivitiesTestData3
    );

    const result = sortedSpaces.map(space => space.id);
    expect(result).toEqual(TestData3_result);
  });
});
