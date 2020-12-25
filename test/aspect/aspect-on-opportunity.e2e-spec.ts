import '../utils/array.matcher';
import { appSingleton } from '../utils/app.singleton';
import { createChallangeMutation } from '../challenge/challenge.request.params';
import {
  createAspectOnOpportunityMutation,
  removeAspectMutation,
  getAspectPerOpportunity,
  updateAspectMutation,
} from './aspect.request.params';
import { createOpportunityOnChallengeMutation } from '../opportunity/opportunity.request.params';

let opportunityName = '';
let opportunityTextId = '';
let opportunityId = '';
let challengeName = '';
let challengeId = '';
let aspectId = ``;
let aspectTitle = '';
let aspectFrame = '';
let aspectExplanation = '';
let uniqueTextId = '';
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
    responseCreateOpportunityOnChallenge.body.data.createOpportunityOnChallenge
      .id;
});

describe('Aspect', () => {
  test('should create aspect on opportunity', async () => {
    // Act
    // Create Actor group
    const createAspectResponse = await createAspectOnOpportunityMutation(
      opportunityId,
      aspectTitle,
      aspectFrame,
      aspectExplanation
    );
    const response = createAspectResponse.body.data.createAspect;

    const getAspect = await getAspectPerOpportunity(opportunityId);
    const aspectData = getAspect.body.data.opportunity.aspects[0];

    // Assert
    expect(createAspectResponse.status).toBe(200);
    expect(response.title).toEqual(aspectTitle);
    expect(response.framing).toEqual(aspectFrame);
    expect(response.explanation).toEqual(aspectExplanation);
    expect(response).toEqual(aspectData);
  });

  test('should create 2 aspects for the same opportunity', async () => {
    // Act
    // Create 2 Aspects with different names
    await createAspectOnOpportunityMutation(
      opportunityId,
      aspectTitle,
      aspectFrame,
      aspectExplanation
    );

    await createAspectOnOpportunityMutation(
      opportunityId,
      aspectTitle + aspectTitle,
      aspectFrame,
      aspectExplanation
    );

    const responseQuery = await getAspectPerOpportunity(opportunityId);

    // Assert
    expect(responseQuery.body.data.opportunity.aspects).toHaveLength(2);
  });

  test('should NOT create 2 aspects for the same opportunity with same name', async () => {
    // Act
    // Create 2 Aspects with same names
    await createAspectOnOpportunityMutation(
      opportunityId,
      aspectTitle,
      aspectFrame,
      aspectExplanation
    );

    const responseSecondAspect = await createAspectOnOpportunityMutation(
      opportunityId,
      aspectTitle,
      aspectFrame,
      aspectExplanation
    );

    const responseQuery = await getAspectPerOpportunity(opportunityId);

    // Assert
    expect(responseQuery.body.data.opportunity.aspects).toHaveLength(1);
    expect(responseSecondAspect.body.errors[0].message).toEqual(
      `Already have an aspect with the provided title: ${aspectTitle}`
    );
  });

  test('should update aspect', async () => {
    // Arrange
    // Create Aspect
    const createAspectResponse = await createAspectOnOpportunityMutation(
      opportunityId,
      aspectTitle,
      aspectFrame,
      aspectExplanation
    );
    aspectId = createAspectResponse.body.data.createAspect.id;

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

    const getAspect = await getAspectPerOpportunity(opportunityId);
    const aspectData = getAspect.body.data.opportunity.aspects[0];

    // Assert
    expect(getAspect.body.data.opportunity.aspects).toHaveLength(1);
    expect(responseUpdateAspectData).toEqual(aspectData);
  });

  test('should remove created aspect from opportunity', async () => {
    // Arrange
    // Create aspect
    const responseCreateAspect = await createAspectOnOpportunityMutation(
      opportunityId,
      aspectTitle,
      aspectFrame,
      aspectExplanation
    );
    aspectId = responseCreateAspect.body.data.createAspect.id;

    // Act
    // Remove aspect
    const responseRemoveAaspect = await removeAspectMutation(aspectId);

    const responseQuery = await getAspectPerOpportunity(opportunityId);

    // Assert
    expect(responseQuery.body.data.opportunity.aspects).toHaveLength(0);
    expect(responseRemoveAaspect.body.data.removeAspect).toEqual(true);
  });
});
