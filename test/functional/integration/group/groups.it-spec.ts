import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';
import { createChallangeMutation } from '@test/functional/integration/challenge/challenge.request.params';
import { createOrganisationMutation } from '../organisation/organisation.request.params';
import {
  createGroupMutation,
  createGroupOnChallengeMutation,
  createGroupOnOpportunityMutation,
  createGroupOnOrganisationMutation,
  getGroup,
  getGroupParent,
  getGroups,
  removeUserGroupMutation,
  updateGroupMutation,
} from '../group/group.request.params';
import {
  createUserMutation,
  removeUserMutation,
} from '@test/functional/e2e/user-management/user.request.params';
import { createOpportunityOnChallengeMutation } from '../opportunity/opportunity.request.params';
import { TestDataServiceInitResult } from '@utils/data-management/test-data.service';

let data: TestDataServiceInitResult;
let userId: number;
let groupName = '';
let ecoverseGroupId = '';
let organisationName = '';
let organisationId = '';
let uniqueTextId = '';
let opportunityName = '';
let opportunityTextId = '';
let opportunityId = '';
let challengeName = '';
let challengeId = '';

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
    organisationName
  );
  organisationId = responseCreateOrganisation.body.data.createOrganisation.id;

  // Create Challenge
  const responseCreateChallenge = await createChallangeMutation(
    challengeName,
    uniqueTextId
  );
  challengeId = responseCreateChallenge.body.data.createChallenge.id;

  // Create Opportunity
  const responseCreateOpportunityOnChallenge = await createOpportunityOnChallengeMutation(
    challengeId,
    opportunityName,
    opportunityTextId
  );
  opportunityId =
    responseCreateOpportunityOnChallenge.body.data.createOpportunityOnChallenge
      .id;
});

afterAll(async () => {
  if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
});

describe('Groups', () => {
  afterEach(async () => {
    await removeUserMutation(userId);
    await removeUserGroupMutation(ecoverseGroupId);
  });
  test('should create ecoverse group', async () => {
    // Act

    // Create ecoverse group
    const responseCreateGroupOnEcoverse = await createGroupMutation(groupName);
    ecoverseGroupId =
      responseCreateGroupOnEcoverse.body.data.createGroupOnEcoverse.id;

    const groupData = await getGroup(ecoverseGroupId);

    const groupsData = await getGroups();

    // Assert
    expect(groupData.body.data.group.id).toEqual(
      responseCreateGroupOnEcoverse.body.data.createGroupOnEcoverse.id
    );
    expect(groupData.body.data.group.name).toEqual(
      responseCreateGroupOnEcoverse.body.data.createGroupOnEcoverse.name
    );

    expect(groupsData.body.data.groups).toContainObject({
      id: `${ecoverseGroupId}`,
      name: `${groupName}`,
    });
  });

  test('should remove ecoverse group', async () => {
    // Arrange
    // Create ecoverse group
    const responseCreateGroupOnEcoverse = await createGroupMutation(groupName);
    ecoverseGroupId =
      responseCreateGroupOnEcoverse.body.data.createGroupOnEcoverse.id;

    // Act
    const response = await removeUserGroupMutation(ecoverseGroupId);

    const groupsData = await getGroups();

    // Assert
    expect(response.body.data.removeUserGroup).toEqual(true);

    expect(groupsData.body.data.groups).not.toContainObject({
      id: `${ecoverseGroupId}`,
      name: `${groupName}`,
    });
  });

  test('should update ecoverse group', async () => {
    // Arrange
    // Create ecoverse group
    const responseCreateGroupOnEcoverse = await createGroupMutation(groupName);
    ecoverseGroupId =
      responseCreateGroupOnEcoverse.body.data.createGroupOnEcoverse.id;

    // Act
    const response = await updateGroupMutation(
      ecoverseGroupId,
      groupName + 'change'
    );

    const groupsData = await getGroups();

    // Assert
    expect(groupsData.body.data.groups).toContainObject({
      id: `${ecoverseGroupId}`,
      name: `${groupName + 'change'}`,
    });
  });

  test('should throw error for removing restricted group', async () => {
    // Act
    const responseRemoveRestrictedGroup = await removeUserGroupMutation(2);

    const groupsData = await getGroups();

    // Assert
    expect(responseRemoveRestrictedGroup.text).toContain(
      'Unable to remove User Group with the specified ID: 2; restricted group: ecoverse-admins'
    );

    expect(groupsData.body.data.groups).not.toContainObject({
      id: 2,
      name: 'ecoverse-admins',
    });
  });

  test('should throw error for creating group with restricted name', async () => {
    // Act
    // Create ecoverse group
    const responseCreateGroupOnEcoverse = await createGroupMutation(
      'ecoverse-admins'
    );

    // Assert
    expect(responseCreateGroupOnEcoverse.text).toContain(
      'Unable to create user group as parent already has a group with the given name: ecoverse-admins'
    );
  });

  test('should throw error for updating group name to restricted group name', async () => {
    // Arrange
    // Create ecoverse group
    const responseCreateGroupOnEcoverse = await createGroupMutation(groupName);
    ecoverseGroupId =
      responseCreateGroupOnEcoverse.body.data.createGroupOnEcoverse.id;

    // Act
    // Update new group name to existing restricted group name
    const responseUpdateMutation = await updateGroupMutation(
      ecoverseGroupId,
      'ecoverse-admins'
    );

    const groupsData = await getGroups();

    // Assert

    expect(responseUpdateMutation.text).toContain(
      `Unable to rename User Group with the specified ID: ${ecoverseGroupId}; new name is a restricted name: ecoverse-admins`
    );

    expect(groupsData.body.data.groups).toContainObject({
      id: `${ecoverseGroupId}`,
      name: `${groupName}`,
    });
  });

  test('should throw error for updating restricted group name', async () => {
    // Act
    // Update restricted group name
    const responseUpdateMutation = await updateGroupMutation(2, groupName);

    const groupsData = await getGroups();

    // Assert
    expect(responseUpdateMutation.text).toContain(
      'Unable to rename User Group with the specified ID: 2; restricted group: ecoverse-admins'
    );

    expect(groupsData.body.data.groups).toContainObject({
      id: '2',
      name: 'ecoverse-admins',
    });

    expect(groupsData.body.data.groups).not.toContainObject({
      id: '2',
      name: `${groupName}`,
    });
  });

  test('should throw error for creating group with empty name', async () => {
    // Act
    // Create ecoverse group
    const responseCreateGroupOnEcoverse = await createGroupMutation('');

    const groupsData = await getGroups();

    // Assert
    expect(responseCreateGroupOnEcoverse.text).toContain(
      'Unable to create a group with an empty name'
    );

    expect(groupsData.body.data.groups).not.toContainObject({
      id: `${ecoverseGroupId}`,
      name: '',
    });
  });

  test('should get groups parent ecoverse', async () => {
    // Arrange
    // Create ecoverse group
    const responseCreateGroupOnEcoverse = await createGroupMutation(groupName);
    ecoverseGroupId =
      responseCreateGroupOnEcoverse.body.data.createGroupOnEcoverse.id;

    // Act
    const groupParent = await getGroupParent(ecoverseGroupId);

    // Assert
    expect(groupParent.body.data.group.parent).toEqual({
      __typename: 'Ecoverse',
      id: '1',
      name: 'Cherrytwist dogfood',
    });
    expect(groupParent.body.data.group.parent).not.toContainObject({
      __typename: 'Organisation',
    });
    expect(groupParent.body.data.group.parent).not.toContainObject({
      __typename: 'Challenge',
    });
    expect(groupParent.body.data.group.parent).not.toContainObject({
      __typename: 'Opportunity',
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

    expect(groupParent.body.data.group.parent).not.toContainObject({
      __typename: 'Ecoverse',
      id: '1',
      name: 'Cherrytwist dogfood',
    });
    expect(groupParent.body.data.group.parent).toEqual({
      __typename: 'Organisation',
      id: organisationId,
      name: organisationName,
    });
    expect(groupParent.body.data.group.parent).not.toContainObject({
      __typename: 'Challenge',
    });
    expect(groupParent.body.data.group.parent).not.toContainObject({
      __typename: 'Opportunity',
    });
  });

  test('should get groups parent challenge', async () => {
    // Arrange

    // Create challenge group
    const responseCreateGroupeOnChallenge = await createGroupOnChallengeMutation(
      challengeName,
      challengeId
    );
    const challengeGroupId =
      responseCreateGroupeOnChallenge.body.data.createGroupOnChallenge.id;

    // Act
    const groupParent = await getGroupParent(challengeGroupId);

    expect(groupParent.body.data.group.parent).not.toContainObject({
      __typename: 'Ecoverse',
      id: '1',
      name: 'Cherrytwist dogfood',
    });
    expect(groupParent.body.data.group.parent).not.toContainObject({
      __typename: 'Organisation',
      id: organisationId,
      name: organisationName,
    });
    expect(groupParent.body.data.group.parent).toEqual({
      __typename: 'Challenge',
      id: challengeId,
      name: challengeName,
    });
    expect(groupParent.body.data.group.parent).not.toContainObject({
      __typename: 'Opportunity',
    });
  });

  test('should get groups parent opportunity', async () => {
    // Arrange
    // Create opportunity group
    const responseCreateGroupeOnOpportunity = await createGroupOnOpportunityMutation(
      opportunityName,
      opportunityId
    );
    const opportunityGroupId =
      responseCreateGroupeOnOpportunity.body.data.createGroupOnOpportunity.id;

    // Act
    const groupParent = await getGroupParent(opportunityGroupId);

    expect(groupParent.body.data.group.parent).not.toContainObject({
      __typename: 'Ecoverse',
      id: '1',
      name: 'Cherrytwist dogfood',
    });
    expect(groupParent.body.data.group.parent).not.toContainObject({
      __typename: 'Organisation',
      id: organisationId,
      name: organisationName,
    });
    expect(groupParent.body.data.group.parent).not.toContainObject({
      __typename: 'Challenge',
      id: challengeId,
      name: challengeName,
    });
    expect(groupParent.body.data.group.parent).toEqual({
      __typename: 'Opportunity',
      id: opportunityId,
      name: opportunityName,
    });
  });
});
