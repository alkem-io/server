import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';
import { createChallangeMutation } from '@test/functional/integration/challenge/challenge.request.params';

import { createChildChallengeMutation, createOpportunityMutation } from '@test/functional/integration/opportunity/opportunity.request.params';
import {
  createActorGroupMutation,
  getActorGroupsPerOpportunity,
} from '@test/functional/integration/actor-groups/actor-groups.request.params';
import {
  createActorMutation,
  getActorData,
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
let actorDataCreate = '';
let ecosystemModelId = '';

let actorData = async (): Promise<string> => {
  const getActor = await getActorData(opportunityId);
  let response =
    getActor.body.data.ecoverse.opportunity.context.ecosystemModel.actorGroups[0]
      .actors[0];
  return response;
};

let actorsCountPerActorGroup = async (): Promise<number> => {
  const responseQuery = await getActorGroupsPerOpportunity(opportunityId);
  let response =
    responseQuery.body.data.ecoverse.opportunity.context.ecosystemModel.actorGroups[0].actors;
  return response;
};
beforeEach(async () => {
  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  challengeName = `testChallenge ${uniqueTextId}`;
  opportunityName = `opportunityName ${uniqueTextId}`;
  opportunityTextId = `opp${uniqueTextId}`;
  actorGroupName = `actorGroupName-${uniqueTextId}`;
  actorGroupDescription = `actorGroupDescription-${uniqueTextId}`;
  actorName = `actorName-${uniqueTextId}`;
  actorDescription = `actorName-${uniqueTextId}`;
  actorValue = `actorName-${uniqueTextId}`;
  actorImpact = `actorName-${uniqueTextId}`;
});

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
  const responseCreateOpportunityOnChallenge = await createOpportunityMutation(
    challengeId,
    opportunityName,
    opportunityTextId
  );
  opportunityId =
    responseCreateOpportunityOnChallenge.body.data.createOpportunity.id;
  ecosystemModelId =
    responseCreateOpportunityOnChallenge.body.data.createOpportunity.context
      .ecosystemModel.id;

  // Create Actor Group
  const createActorGroupResponse = await createActorGroupMutation(
    ecosystemModelId,
    actorGroupName,
    actorGroupDescription
  );
  actorGroupId = createActorGroupResponse.body.data.createActorGroup.id;

  // Create Actor
  const createActorResponse = await createActorMutation(
    actorGroupId,
    actorName,
    actorDescription,
    actorValue,
    actorImpact
  );
  actorDataCreate = createActorResponse.body.data.createActor;
  actorId = createActorResponse.body.data.createActor.id;
});

afterEach(async () => {
  await removeActorMutation(actorId);
});

describe('Actors', () => {
  test('should assert created actor', async () => {
    // Assert
    expect(actorDataCreate).toEqual(await actorData());
  });

  test('should update actor', async () => {
    // Act
    const updateActorResponse = await updateActorMutation(
      actorId,
      actorName + 'change',
      actorDescription + 'change',
      actorValue + 'change',
      actorImpact + 'change'
    );
    const response = updateActorResponse.body;

    // Assert
    expect(response.data.updateActor).toEqual(await actorData());
  });

  test('should remove actor', async () => {
    // Act
    const removeActorResponse = await removeActorMutation(actorId);

    // Assert
    expect(removeActorResponse.body.data.deleteActor.id).toEqual(actorId);
    expect(await actorsCountPerActorGroup()).toHaveLength(0);
  });

  test('should create 2 actors with same details and query them', async () => {
    // Act
    await createActorMutation(
      actorGroupId,
      actorName,
      actorDescription,
      actorValue,
      actorImpact
    );

    // Assert
    expect(await actorsCountPerActorGroup()).toHaveLength(2);
  });
});
