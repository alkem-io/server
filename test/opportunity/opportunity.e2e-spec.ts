import '../utils/array.matcher';
import { appSingleton } from '../utils/app.singleton';
import { createChallangeMutation } from '../challenge/challenge.request.params';
import {
  createOpportunityOnChallengeMutation,
  queryOpportunities,
  queryOpportunity,
  removeOpportunityMutation,
  updateOpportunityOnChallengeMutation,
} from './opportunity.request.params';

let opportunityName = '';
let opportunityTextId = '';
let opportunityId = '';
let challengeName = '';
let challengeId = '';
let uniqueTextId = '';
beforeEach(async () => {
  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  challengeName = `testChallenge ${uniqueTextId}`;
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

beforeEach(async () => {
  const responseCreateChallenge = await createChallangeMutation(
    challengeName,
    uniqueTextId
  );
  challengeId = responseCreateChallenge.body.data.createChallenge.id;
});

describe('Opportunities', () => {
  test('should create opportunity and query the data', async () => {
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

  test('should remove opportunity and query the data', async () => {
    // Arrange
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunityOnChallengeMutation(
      challengeId,
      opportunityName,
      opportunityTextId
    );

    opportunityId =
      responseCreateOpportunityOnChallenge.body.data
        .createOpportunityOnChallenge.id;

    // Act
    // Remove opportunity
    const removeOpportunityResponse = await removeOpportunityMutation(
      opportunityId
    );

    // Query Opportunity data
    const requestQueryOpportunity = await queryOpportunity(opportunityId);

    // Assert
    expect(responseCreateOpportunityOnChallenge.status).toBe(200);
    expect(removeOpportunityResponse.body.data.removeOpportunity).toEqual(true);
    expect(requestQueryOpportunity.body.errors[0].message).toEqual(
      `Unable to find Opportunity with ID: ${opportunityId}`
    );
  });

  test('should get all opportunities', async () => {
    // Arrange
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunityOnChallengeMutation(
      challengeId,
      opportunityName,
      opportunityTextId
    );

    opportunityName =
      responseCreateOpportunityOnChallenge.body.data
        .createOpportunityOnChallenge.name;

    // Act
    // Get all opportunities
    const getAllOpportunityResponse = await queryOpportunities();

    // Assert
    expect(responseCreateOpportunityOnChallenge.status).toBe(200);
    expect(getAllOpportunityResponse.body.data.opportunities).toContainObject({
      name: `${opportunityName}`,
    });
  });

  test('should create opportunity with same name/textId on different challenges', async () => {
    // Arrange
    const responseCreateChallengeTwo = await createChallangeMutation(
      `${challengeName}ch`,
      `${uniqueTextId}ch`
    );
    const secondChallengeId =
      responseCreateChallengeTwo.body.data.createChallenge.id;

    // Act
    // Create Opportunity on Challange One
    const responseCreateOpportunityOnChallengeOne = await createOpportunityOnChallengeMutation(
      challengeId,
      opportunityName,
      opportunityTextId
    );

    const responseCreateOpportunityOnChallengeTwo = await createOpportunityOnChallengeMutation(
      secondChallengeId,
      opportunityName,
      opportunityTextId
    );

    // Assert
    expect(responseCreateOpportunityOnChallengeOne.status).toBe(200);
    expect(responseCreateOpportunityOnChallengeTwo.status).toBe(200);
    expect(
      responseCreateOpportunityOnChallengeOne.body.data
        .createOpportunityOnChallenge.name
    ).toEqual(
      responseCreateOpportunityOnChallengeTwo.body.data
        .createOpportunityOnChallenge.name
    );
    expect(
      responseCreateOpportunityOnChallengeOne.body.data
        .createOpportunityOnChallenge.textID
    ).toEqual(
      responseCreateOpportunityOnChallengeTwo.body.data
        .createOpportunityOnChallenge.textID
    );
  });
});

describe('DDT should not create opportunities with same name or textId within the same challenge', () => {
  // Arrange
  test.each`
    opportunityNameD | opportunityTextIdD | expected
    ${'opp name a'}  | ${'opp-textid-a'}  | ${'opp name a'}
    ${'opp name b'}  | ${'opp-textid-a'}  | ${'Trying to create an opportunity but one with the given textID already exists: opp-textid-a'}
    ${'opp name a'}  | ${'opp-textid-b'}  | ${'Opportunity with name: opp name a already exists!'}
    ${'opp name b'}  | ${'opp-textid-b'}  | ${'opp name b'}
  `(
    "should expect: '$expected' for opportunity creation with name: '$opportunityNameD' and textId: '$opportunityTextIdD'",
    async ({ opportunityNameD, opportunityTextIdD, expected }) => {
      // Act
      // Create Opportunity
      const responseCreateOpportunityOnChallenge = await createOpportunityOnChallengeMutation(
        "1",
        opportunityNameD,
        opportunityTextIdD
      );
      const responseData = JSON.stringify(
        responseCreateOpportunityOnChallenge.body
      ).replace('\\', '');
      console.log(responseData);

      // Assert
      expect(responseCreateOpportunityOnChallenge.status).toBe(200);
      expect(responseData).toContain(expected);
    }
  );
});
