import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';
import { createChallangeMutation } from '@test/functional/integration/challenge/challenge.request.params';
import {
  createAspectOnOpportunityMutation,
  removeAspectMutation,
  getAspectPerOpportunity,
  updateAspectMutation,
} from './aspect.request.params';
import { createOpportunityOnChallengeMutation } from '@test/functional/integration/opportunity/opportunity.request.params';

let opportunityName = '';
let opportunityTextId = '';
let opportunityId = '';
let challengeName = '';
let challengeId = '';
let aspectId = '';
let aspectTitle = '';
let aspectFrame = '';
let aspectExplanation = '';
let aspectDataCreate = '';
let uniqueTextId = '';
let aspectCountPerOpportunity = async (): Promise<number> => {
  const responseQuery = await getAspectPerOpportunity(opportunityId);
  let response = responseQuery.body.data.opportunity.aspects;
  return response;
};

let aspectDataPerOpportunity = async (): Promise<String> => {
  const responseQuery = await getAspectPerOpportunity(opportunityId);
  let response = responseQuery.body.data.opportunity.aspects[0];
  return response;
};
beforeEach(async () => {
  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  challengeName = `testChallenge ${uniqueTextId}`;
  opportunityName = `opportunityName ${uniqueTextId}`;
  opportunityTextId = `${uniqueTextId}`;
  aspectTitle = `aspectTitle-${uniqueTextId}`;
  aspectFrame = `aspectFrame-${uniqueTextId}`;
  aspectExplanation = `aspectExplanation-${uniqueTextId}`;
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
  const responseCreateOpportunityOnChallenge = await createOpportunityOnChallengeMutation(
    challengeId,
    opportunityName,
    opportunityTextId
  );
  opportunityId =
    responseCreateOpportunityOnChallenge.body.data.createOpportunity
      .id;

  // Create Aspect on opportunity group
  const createAspectResponse = await createAspectOnOpportunityMutation(
    opportunityId,
    aspectTitle,
    aspectFrame,
    aspectExplanation
  );
  aspectDataCreate = createAspectResponse.body.data.createAspect;
  aspectId = createAspectResponse.body.data.createAspect.id;
});

afterEach(async () => {
  await removeAspectMutation(aspectId);
});

describe('Aspect', () => {
  test('should assert created aspect on opportunity', async () => {
    // Assert
    expect(await aspectDataPerOpportunity()).toEqual(aspectDataCreate);
  });

  test('should create 2 aspects for the same opportunity', async () => {
    // Act
    // Create second aspect with different names
    await createAspectOnOpportunityMutation(
      opportunityId,
      aspectTitle + aspectTitle,
      aspectFrame,
      aspectExplanation
    );
    // Assert
    expect(await aspectCountPerOpportunity()).toHaveLength(2);
  });

  test('should NOT create 2 aspects for the same opportunity with same name', async () => {
    // Act
    // Create second aspects with same names
    const responseSecondAspect = await createAspectOnOpportunityMutation(
      opportunityId,
      aspectTitle,
      aspectFrame,
      aspectExplanation
    );

    // Assert
    expect(await aspectCountPerOpportunity()).toHaveLength(1);
    expect(responseSecondAspect.body.errors[0].message).toEqual(
      `Already have an aspect with the provided title: ${aspectTitle}`
    );
  });

  test('should update aspect', async () => {
    // Act
    // Update Aspect
    const responseUpdateAspect = await updateAspectMutation(
      aspectId,
      `${aspectTitle} + change`,
      `${aspectFrame} + change`,
      `${aspectExplanation} + change`
    );
    const responseUpdateAspectData =
      responseUpdateAspect.body.data.updateAspect;

    // Assert
    expect(await aspectCountPerOpportunity()).toHaveLength(1);
    expect(responseUpdateAspectData).toEqual(await aspectDataPerOpportunity());
  });

  test('should remove created aspect from opportunity', async () => {
    // Act
    // Remove aspect
    const responseRemoveAaspect = await removeAspectMutation(aspectId);

    // Assert
    expect(await aspectCountPerOpportunity()).toHaveLength(0);
    expect(responseRemoveAaspect.body.data.removeAspect).toEqual(true);
  });
});
