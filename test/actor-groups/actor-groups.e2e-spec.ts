import '@utils/array.matcher';
import { appSingleton } from '@utils/app.singleton';
import { createChallangeMutation } from '@domain/challenge/challenge.request.params';
import {
  createActorGroupMutation,
  getActorGroupsPerOpportunity,
  removeActorGroupMutation,
} from './actor-groups.request.params';
import { createOpportunityOnChallengeMutation } from '@domain/opportunity/opportunity.request.params';

let opportunityName = '';
let opportunityTextId = '';
let opportunityId = '';
let challengeName = '';
let challengeId = '';
let actorGroupName = '';
let actorGroupDescription = '';
let uniqueTextId = '';
beforeEach(async () => {
  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  challengeName = `testChallenge ${uniqueTextId}`;
  opportunityName = `opportunityName ${uniqueTextId}`;
  opportunityTextId = `${uniqueTextId}`;
  actorGroupName = `actorGroupName-${uniqueTextId}`;
  actorGroupDescription = `actorGroupDescription-${uniqueTextId}`;
});

//let challengeNames ='';

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
});

afterAll(async () => {
  if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
});

beforeEach(async () => {
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

describe('Actor groups', () => {
  test('should create actor group without actor', async () => {
    // Act
    // Create Actor group
    const createActorGroupResponse = await createActorGroupMutation(
      opportunityId,
      actorGroupName,
      actorGroupDescription
    );
    const response = createActorGroupResponse.body;

    // Assert
    expect(createActorGroupResponse.status).toBe(200);
    expect(response.data.createActorGroup.actors).toHaveLength(0);
    expect(response.data.createActorGroup.name).toEqual(actorGroupName);
    expect(response.data.createActorGroup.description).toEqual(
      actorGroupDescription
    );
  });

  test('should create 2 actor groups for the same opportunity', async () => {
    // Act
    // Create 2 Actor Groups with different names
    await createActorGroupMutation(
      opportunityId,
      actorGroupName,
      actorGroupDescription
    );

    await createActorGroupMutation(
      opportunityId,
      actorGroupName + actorGroupName,
      actorGroupDescription
    );

    const responseQuery = await getActorGroupsPerOpportunity(opportunityId);

    // Assert
    expect(responseQuery.body.data.opportunity.actorGroups).toHaveLength(2);
  });

  test('should NOT create 2 actor groups for the same opportunity with same name', async () => {
    // Act
    // Create 2 Actor Groups with same names
    await createActorGroupMutation(
      opportunityId,
      actorGroupName,
      actorGroupDescription
    );

    const responseSecondActorGroup = await createActorGroupMutation(
      opportunityId,
      actorGroupName,
      actorGroupDescription
    );

    const responseQuery = await getActorGroupsPerOpportunity(opportunityId);

    // Assert
    expect(responseQuery.body.data.opportunity.actorGroups).toHaveLength(1);
    expect(responseSecondActorGroup.body.errors[0].message).toEqual(
      `Already have an actor group with the provided name: ${actorGroupName}`
    );
  });

  test('should remove created actor group', async () => {
    // Arrange
    // Create 2 Actor Groups with same names
    const responseCreateActorGroup = await createActorGroupMutation(
      opportunityId,
      actorGroupName + 'Test',
      actorGroupDescription
    );
    const actorGroupId = responseCreateActorGroup.body.data.createActorGroup.id;

    // Act
    const responseRemoveActorGroup = await removeActorGroupMutation(
      actorGroupId
    );

    const responseQuery = await getActorGroupsPerOpportunity(opportunityId);

    // Assert
    expect(responseQuery.body.data.opportunity.actorGroups).toHaveLength(0);
    expect(responseRemoveActorGroup.body.data.removeActorGroup).toEqual(true);
  });
});
