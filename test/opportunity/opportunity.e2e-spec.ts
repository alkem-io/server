import '../utils/array.matcher';
import { appSingleton } from '../utils/app.singleton';
import { createChallangeMutation } from '../challenge/challenge.request.params';
import {
  createOpportunityOnChallengeMutation,
  queryOpportunity,
  updateOpportunityOnChallengeMutation,
} from './opportunity.request.params';

let opportunityName = '';
let opportunityTextId = '';
let opportunityId = '';
let userName = '';
let userPhone = '';
let userEmail = '';
let groupName = '';
let challengeName = '';
let challengeId = '';
let uniqueTextId = '';
beforeEach(async () => {
  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  challengeName = `testChallenge ${uniqueTextId}`;
  userName = `testUser ${uniqueTextId}`;
  userPhone = `userPhone ${uniqueTextId}`;
  userEmail = `${uniqueTextId}@test.com`;
  groupName = `groupName ${uniqueTextId}`;
  opportunityName = `opportunityName ${uniqueTextId}`;
  opportunityTextId = `${uniqueTextId}`;
});

//let challengeNames ='';

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
});

afterAll(async () => {
  if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
});

describe('Opportunities', () => {
  test('should create opportunity and query the data', async () => {
    // Arrange
    const responseCreateChallenge = await createChallangeMutation(
      challengeName,
      uniqueTextId
    );
    challengeId = responseCreateChallenge.body.data.createChallenge.id;

    // Act
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunityOnChallengeMutation(
      challengeId,
      opportunityName,
      opportunityTextId
    );

    const createOpportunityData =
      responseCreateOpportunityOnChallenge.body.data
        .createOpportunityOnChallenge;

    opportunityId =
      responseCreateOpportunityOnChallenge.body.data
        .createOpportunityOnChallenge.id;

    // Query Opportunity data
    const requestQueryOpportunity = await queryOpportunity(opportunityId);
    const requestOpportunityData =
      requestQueryOpportunity.body.data.opportunity;

    // Assert
    expect(responseCreateOpportunityOnChallenge.status).toBe(200);
    expect(createOpportunityData).toEqual(requestOpportunityData);
  });

  test('should update opportunity and query the data', async () => {
    // Arrange
    // Create a Challenge
    const responseCreateChallenge = await createChallangeMutation(
      challengeName,
      uniqueTextId
    );
    challengeId = responseCreateChallenge.body.data.createChallenge.id;

    // Create Opportunity on Challenge
    const responseCreateOpportunityOnChallenge = await createOpportunityOnChallengeMutation(
      challengeId,
      opportunityName,
      opportunityTextId
    );

    opportunityId =
      responseCreateOpportunityOnChallenge.body.data
        .createOpportunityOnChallenge.id;

    // Act
    // Update the created Opportunity
    const responseUpdateOpportunity = await updateOpportunityOnChallengeMutation(
      opportunityId
    );
    const updateOpportunityData =
      responseUpdateOpportunity.body.data.updateOpportunity;

    // Query Opportunity data
    const requestQueryOpportunity = await queryOpportunity(opportunityId);
    const requestOpportunityData =
      requestQueryOpportunity.body.data.opportunity;

    // Assert
    expect(responseUpdateOpportunity.status).toBe(200);
    expect(updateOpportunityData).toEqual(requestOpportunityData);
  });
});
