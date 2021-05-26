import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';
import { createChallangeMutation } from '@test/functional/integration/challenge/challenge.request.params';
import {
  createActorGroupMutation,
  getActorGroupsPerOpportunity,
  removeActorGroupMutation,
} from './actor-groups.request.params';
import {
  createChildChallengeMutation,
  createOpportunityMutation,
} from '@test/functional/integration/opportunity/opportunity.request.params';

let opportunityName = '';
let opportunityTextId = '';
let opportunityId = '';
let challengeName = '';
let challengeId = '';
let actorGroupName = '';
let actorGroupDescription = '';
let uniqueTextId = '';
let actorGroupId = '';
let actorGroupDataCreate = '';
let ecosystemModelId = '';

let getActorGroupData = async (): Promise<string> => {
  const getActor = await getActorGroupsPerOpportunity(opportunityId);
  let response =
    getActor.body.data.ecoverse.opportunity.context.ecosystemModel
      .actorGroups[0];
  return response;
};

let getActorGroupsCountPerOpportunityData = async (): Promise<string> => {
  const getActor = await getActorGroupsPerOpportunity(opportunityId);
  let response =
    getActor.body.data.ecoverse.opportunity.context.ecosystemModel.actorGroups;
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

  // Create Actor group
  const createActorGroupResponse = await createActorGroupMutation(
    ecosystemModelId,
    actorGroupName,
    actorGroupDescription
  );
  actorGroupId = createActorGroupResponse.body.data.createActorGroup.id;
  actorGroupDataCreate = createActorGroupResponse.body.data.createActorGroup;
});

afterEach(async () => {
  await removeActorGroupMutation(actorGroupId);
});

describe('Actor groups', () => {
  test('should assert created actor group without actor', async () => {
    // Assert
    expect(actorGroupDataCreate).toEqual(await getActorGroupData());
  });

  test('should create 2 actor groups for the same opportunity', async () => {
    // Act
    // Create second actor group with different name
    await createActorGroupMutation(
      ecosystemModelId,
      actorGroupName + actorGroupName,
      actorGroupDescription
    );

    // Assert
    expect(await getActorGroupsCountPerOpportunityData()).toHaveLength(2);
  });

  test('should NOT create 2 actor groups for the same opportunity with same name', async () => {
    // Act
    // Create second actor group with same name
    const responseSecondActorGroup = await createActorGroupMutation(
      ecosystemModelId,
      actorGroupName,
      actorGroupDescription
    );

    // Assert
    expect(await getActorGroupsCountPerOpportunityData()).toHaveLength(1);
    expect(responseSecondActorGroup.body.errors[0].message).toEqual(
      `Already have an actor group with the provided name: ${actorGroupName}`
    );
  });

  test('should remove created actor group', async () => {
    // Act
    const responseRemoveActorGroup = await removeActorGroupMutation(
      actorGroupId
    );

    // Assert
    expect(await getActorGroupsCountPerOpportunityData()).toHaveLength(0);
    expect(responseRemoveActorGroup.body.data.deleteActorGroup.id).toEqual(
      actorGroupId
    );
  });
});
