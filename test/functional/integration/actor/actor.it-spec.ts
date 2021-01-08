import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';
import { createChallangeMutation } from '@test/functional/integration/challenge/challenge.request.params';

import { createOpportunityOnChallengeMutation } from '@test/functional/integration/opportunity/opportunity.request.params';
import {
  createActorGroupMutation,
  getActorGroupsPerOpportunity,
} from '@test/functional/integration/actor-groups/actor-groups.request.params';
import {
  createActorMutation,
  removeActorMutation,
  updateActorMutation,
} from './actor.request.params';

let opportunityName = '';
let opportunityTextId = '';
let opportunityId = '';
let challengeName = '';
let challengeId = '';
let actorGroupId = '';
let actorGroupName = '';
let actorGroupDescription = '';
let actorId = '';
let actorName = '';
let actorDescription = '';
let actorValue = '';
let actorImpact = '';
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
  actorName = `actorName-${uniqueTextId}`;
  actorDescription = `actorName-${uniqueTextId}`;
  actorValue = `actorName-${uniqueTextId}`;
  actorImpact = `actorName-${uniqueTextId}`;
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
  // Create Actor Group
  const createActorGroupResponse = await createActorGroupMutation(
    opportunityId,
    actorGroupName,
    actorGroupDescription
  );
  actorGroupId = createActorGroupResponse.body.data.createActorGroup.id;
});

describe('Actors', () => {
  test('should create actor', async () => {
    // Act
    // Create Actor
    const createActorResponse = await createActorMutation(
      actorGroupId,
      actorName,
      actorDescription,
      actorValue,
      actorImpact
    );
    const response = createActorResponse.body;

    // Assert
    expect(createActorResponse.status).toBe(200);
    expect(response.data.createActor.name).toEqual(actorName);
    expect(response.data.createActor.description).toEqual(actorDescription);
    expect(response.data.createActor.value).toEqual(actorValue);
    expect(response.data.createActor.impact).toEqual(actorImpact);
  });

  test('should update actor', async () => {
    // Arrange
    // Create Actor
    const createActorResponse = await createActorMutation(
      actorGroupId,
      actorName,
      actorDescription,
      actorValue,
      actorImpact
    );
    actorId = createActorResponse.body.data.createActor.id;

    // Arrange
    // Update Actor
    const updateActorResponse = await updateActorMutation(
      actorId,
      actorName + 'change',
      actorDescription + 'change',
      actorValue + 'change',
      actorImpact + 'change'
    );
    const response = updateActorResponse.body;

    // Assert
    expect(createActorResponse.status).toBe(200);
    expect(response.data.updateActor.name).toEqual(actorName + 'change');
    expect(response.data.updateActor.description).toEqual(
      actorDescription + 'change'
    );
    expect(response.data.updateActor.value).toEqual(actorValue + 'change');
    expect(response.data.updateActor.impact).toEqual(actorImpact + 'change');
  });

  test('should remove actor', async () => {
    // Arrange
    // Create Actor group
    const createActorResponse = await createActorMutation(
      actorGroupId,
      actorName,
      actorDescription,
      actorValue,
      actorImpact
    );
    actorId = createActorResponse.body.data.createActor.id;

    // Act
    const removeActorResponse = await removeActorMutation(actorId);
    const responseQuery = await getActorGroupsPerOpportunity(opportunityId);

    // Assert
    expect(createActorResponse.status).toBe(200);
    expect(removeActorResponse.body.data.removeActor).toEqual(true);
    expect(
      responseQuery.body.data.opportunity.actorGroups[0].actors
    ).toHaveLength(0);
  });

  test('should create 2 actors with same details and query them', async () => {
    // Arrange
    // Create 2 Actors with same names
    await createActorMutation(
      actorGroupId,
      actorName,
      actorDescription,
      actorValue,
      actorImpact
    );

    await createActorMutation(
      actorGroupId,
      actorName,
      actorDescription,
      actorValue,
      actorImpact
    );

    // Act
    const responseQuery = await getActorGroupsPerOpportunity(opportunityId);

    // Assert
    expect(
      responseQuery.body.data.opportunity.actorGroups[0].actors
    ).toHaveLength(2);
  });
});
