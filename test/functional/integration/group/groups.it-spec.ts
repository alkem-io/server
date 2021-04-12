import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';
import { createChallangeMutation } from '@test/functional/integration/challenge/challenge.request.params';
import { createOrganisationMutation } from '../organisation/organisation.request.params';
import {
  createGroupOnOrganisationMutation,
  getGroup,
  getGroupParent,
  getGroups,
  removeUserGroupMutation,
  updateGroupMutation,
} from '../group/group.request.params';
import { createOpportunityOnChallengeMutation } from '../opportunity/opportunity.request.params';
import { TestDataServiceInitResult } from '@src/services/data-management/test-data.service';
import { createGroupOnCommunityMutation } from '../community/community.request.params';

let data: TestDataServiceInitResult;
let userId: number;
let groupName = '';
let communityGroupId = '';
let organisationName = '';
let organisationId = '';
let uniqueTextId = '';
let opportunityName = '';
let opportunityTextId = '';
let challengeName = '';
let challengeId = '';
let challengeCommunityId = '';
let opportunityCommunityId = '';
let getParent = '';
let communityGroupName = '';
let communityGroupProfileID = '';

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
  data = appSingleton.Instance.getData();
  userId = data.userId;
  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  groupName = `QA groupName ${uniqueTextId}`;
  organisationName = `QA organisationName ${uniqueTextId}`;
  challengeName = `testChallenge ${uniqueTextId}`;
  opportunityName = `opportunityName ${uniqueTextId}`;
  opportunityTextId = `${uniqueTextId}`;

  // Create organisation
  const responseCreateOrganisation = await createOrganisationMutation(
    organisationName,
    'org' + uniqueTextId
  );
  organisationId = responseCreateOrganisation.body.data.createOrganisation.id;

  // Create Challenge
  const responseCreateChallenge = await createChallangeMutation(
    challengeName,
    uniqueTextId
  );
  challengeId = responseCreateChallenge.body.data.createChallenge.id;
  challengeCommunityId =
    responseCreateChallenge.body.data.createChallenge.community.id;

  // Create Opportunity
  const responseCreateOpportunityOnChallenge = await createOpportunityOnChallengeMutation(
    challengeId,
    opportunityName,
    opportunityTextId
  );
  opportunityCommunityId =
    responseCreateOpportunityOnChallenge.body.data.createOpportunity.community
      .id;
});

afterAll(async () => {
  if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
});

describe('Groups - groups on community', () => {
  beforeEach(async () => {
    // Create community group
    const responseCreateGroupOnCommunnity = await createGroupOnCommunityMutation(
      challengeCommunityId,
      groupName
    );
    communityGroupId =
      responseCreateGroupOnCommunnity.body.data.createGroupOnCommunity.id;
    communityGroupName =
      responseCreateGroupOnCommunnity.body.data.createGroupOnCommunity.name;
    communityGroupProfileID =
      responseCreateGroupOnCommunnity.body.data.createGroupOnCommunity.profile
        .id;
  });

  afterEach(async () => {
    await removeUserGroupMutation(communityGroupId);
  });
  test('should create community group', async () => {
    // Act
    const groupData = await getGroup(communityGroupId);
    const groupsData = await getGroups();

    // Assert
    expect(groupData.body.data.ecoverse.group.id).toEqual(communityGroupId);
    expect(groupData.body.data.ecoverse.group.name).toEqual(communityGroupName);

    expect(groupsData.body.data.ecoverse.groups).toContainObject({
      id: `${communityGroupId}`,
      name: `${groupName}`,
    });
  });

  test('should remove community challenge group', async () => {
    // Act
    const response = await removeUserGroupMutation(communityGroupId);

    const groupsData = await getGroups();

    // Assert
    expect(response.body.data.removeUserGroup.id).toEqual(communityGroupId);

    expect(groupsData.body.data.ecoverse.groups).not.toContainObject({
      id: `${communityGroupId}`,
      name: `${groupName}`,
    });
  });

  test('should update community challenge group', async () => {
    // Act
    const response = await updateGroupMutation(
      communityGroupId,
      groupName + 'change',
      communityGroupProfileID
    );
    const groupsData = await getGroups();

    // Assert
    expect(groupsData.body.data.ecoverse.groups).toContainObject(
      response.body.data.updateUserGroup
    );
  });

  test('should get groups parent community', async () => {
    // Act
    const groupParent = await getGroupParent(communityGroupId);
    getParent = groupParent.body.data.ecoverse.group.parent;

    // Assert
    expect(getParent).toEqual({
      __typename: 'Community',
      type: 'challenge',
    });
    expect(getParent).not.toContainObject({
      __typename: 'Organisation',
    });
  });

  test('should get groups parent organisation', async () => {
    // Arrange
    // Create organisation group
    const responseCreateGroupeOnOrganisation = await createGroupOnOrganisationMutation(
      organisationName,
      organisationId
    );
    const organisationGroupId =
      responseCreateGroupeOnOrganisation.body.data.createGroupOnOrganisation.id;

    // Act
    const groupParent = await getGroupParent(organisationGroupId);
    getParent = groupParent.body.data.ecoverse.group.parent;

    expect(getParent).not.toEqual({
      __typename: 'Community',
      type: 'challenge',
    });
    expect(getParent).toEqual({
      __typename: 'Organisation',
      id: organisationId,
      name: organisationName,
    });
  });
});
describe('Groups - restricted groups', () => {
  test('should throw error for removing restricted group', async () => {
    // Act
    const responseRemoveRestrictedGroup = await removeUserGroupMutation(2);
    const groupsData = await getGroups();

    // Assert
    expect(responseRemoveRestrictedGroup.text).toContain(
      'Unable to remove User Group with the specified ID: 2; restricted group: ecoverse-admins'
    );
    expect(groupsData.body.data.ecoverse.groups).not.toContainObject({
      id: 2,
      name: 'ecoverse-admins',
    });
  });

  test('should throw error for creating group with restricted ecoverse group name', async () => {
    // Act
    // Create community group
    const responseCreateGroupOnCommunnity = await createGroupOnCommunityMutation(
      1,
      'ecoverse-admins'
    );
    // Assert
    expect(responseCreateGroupOnCommunnity.text).toContain(
      'Unable to create user group as parent already has a group with the given name: ecoverse-admins'
    );
  });

  test('should throw error for creating group with restricted challenge group name', async () => {
    // Act
    // Create community group
    const responseCreateGroupOnCommunnity = await createGroupOnCommunityMutation(
      challengeCommunityId,
      'members'
    );

    // Assert
    expect(responseCreateGroupOnCommunnity.text).toContain(
      'Unable to create user group as parent already has a group with the given name: members'
    );
  });

  test('should throw error for updating group name to restricted group name', async () => {
    // Arrange
    // Create challenge community group
    const responseCreateGroupOnCommunnity = await createGroupOnCommunityMutation(
      challengeCommunityId,
      groupName
    );
    communityGroupId =
      responseCreateGroupOnCommunnity.body.data.createGroupOnCommunity.id;

    // Act
    // Update new group name to existing restricted group name
    const responseUpdateMutation = await updateGroupMutation(
      communityGroupId,
      'members',
      communityGroupProfileID
    );
    const groupsData = await getGroups();

    // Assert
    expect(responseUpdateMutation.text).toContain(
      `Unable to rename User Group with the specified ID: ${communityGroupId}; new name is a restricted name: members`
    );
    expect(groupsData.body.data.ecoverse.groups).toContainObject({
      id: `${communityGroupId}`,
      name: `${groupName}`,
    });
  });

  test('should throw error for updating restricted group name', async () => {
    // Act
    // Update restricted group name
    const responseUpdateMutation = await updateGroupMutation(
      '2',
      groupName,
      communityGroupProfileID
    );
    const groupsData = await getGroups();

    // Assert
    expect(responseUpdateMutation.text).toContain(
      'Unable to rename User Group with the specified ID: 2; restricted group: ecoverse-admins'
    );
    expect(groupsData.body.data.ecoverse.groups).toContainObject({
      id: '2',
      name: 'ecoverse-admins',
    });
    expect(groupsData.body.data.ecoverse.groups).not.toContainObject({
      id: '2',
      name: `${groupName}`,
    });
  });

  test('should throw error for creating group with empty name', async () => {
    // Act
    // Create challenge community group
    const responseCreateGroupOnCommunnity = await createGroupOnCommunityMutation(
      challengeCommunityId,
      ''
    );
    const groupsData = await getGroups();

    // Assert
    expect(responseCreateGroupOnCommunnity.text).toContain(
      'Unable to create a group with an empty name'
    );
    expect(groupsData.body.data.ecoverse.groups).not.toContainObject({
      id: `${communityGroupId}`,
      name: '',
    });
  });
});
