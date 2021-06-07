import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';
import {
  createChallangeMutation,
  getChallengeData,
  getChallengeOpportunity,
} from '@test/functional/integration/challenge/challenge.request.params';
import {
  createChildChallengeMutation,
  queryOpportunity,
} from '../opportunity/opportunity.request.params';
import {
  addChallengeLeadToOrganisationMutation,
  removeChallengeLeadFromOrganisationMutation,
  updateChallangeMutation,
} from './challenge.request.params';
import { createOrganisationMutation } from '../organisation/organisation.request.params';
import { TestDataServiceInitResult } from '@src/services/data-management/test-data.service';

let data: TestDataServiceInitResult;
let opportunityName = '';
let opportunityTextId = '';
let opportunityId = '';
let challengeName = '';
let challengeId = '';
let uniqueTextId = '';
let organisationName = '';
let organisationId = '';
let organisationIdService = '';
let taglineText = '';
const refName = 'refName';
const refUri = 'https://test.com';
const tagsArray = ['tag1', 'tag2'];
let groupName = '';
let userId = '';

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
  data = appSingleton.Instance.getData();
  organisationIdService = data.organisationId.toString();
  userId = data.userId.toString();
});

afterAll(async () => {
  if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
});

beforeEach(async () => {
  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  challengeName = `testChallenge ${uniqueTextId}`;
  opportunityName = `opportunityName ${uniqueTextId}`;
  opportunityTextId = `opp${uniqueTextId}`;
  groupName = `groupName ${uniqueTextId}`;
  organisationName = `organisationName ${uniqueTextId}`;
  taglineText = `taglineText ${uniqueTextId}`;
  const responseCreateChallenge = await createChallangeMutation(
    challengeName,
    uniqueTextId
  );
  challengeId = responseCreateChallenge.body.data.createChallenge.id;
});

describe('Query Challenge data', () => {
  test.skip('should query groups through challenge', async () => {
    // Act
    const responseQueryData = await getChallengeData(challengeId);

    // Assert
    expect(
      responseQueryData.body.data.ecoverse.challenge.community.groups
    ).toHaveLength(1);
    expect(
      responseQueryData.body.data.ecoverse.challenge.community.groups[0].name
    ).toEqual('members');
  });

  test.skip('should query opportunity through challenge', async () => {
    // Act
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createChildChallengeMutation(
      challengeId,
      opportunityName,
      opportunityTextId
    );
    opportunityId =
      responseCreateOpportunityOnChallenge.body.data.createChildChallenge.id;

    // Query Opportunity data through Challenge query
    const responseQueryData = await getChallengeOpportunity(challengeId);

    // Assert
    expect(
      responseQueryData.body.data.ecoverse.challenge.opportunities
    ).toHaveLength(1);
    expect(
      responseQueryData.body.data.ecoverse.challenge.opportunities[0]
        .displayName
    ).toEqual(opportunityName);
    expect(
      responseQueryData.body.data.ecoverse.challenge.opportunities[0].nameID
    ).toEqual(opportunityTextId);
    expect(
      responseQueryData.body.data.ecoverse.challenge.opportunities[0].id
    ).toEqual(opportunityId);
  });

  test('should create opportunity and query the data', async () => {
    // Act
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createChildChallengeMutation(
      challengeId,
      opportunityName,
      opportunityTextId
    );

    const createOpportunityData =
      responseCreateOpportunityOnChallenge.body.data.createChildChallenge;

    opportunityId =
      responseCreateOpportunityOnChallenge.body.data.createChildChallenge.id;

    // Query Opportunity data
    const requestQueryOpportunity = await getChallengeData(opportunityId);
    const requestOpportunityData =
      requestQueryOpportunity.body.data.ecoverse.challenge;

    // Assert
    expect(responseCreateOpportunityOnChallenge.status).toBe(200);
    expect(createOpportunityData).toEqual(requestOpportunityData);
  });

  test('should update a challenge', async () => {
    // Arrange
    const response = await updateChallangeMutation(
      challengeId,
      challengeName + 'change',
      taglineText,
      'background',
      'vision',
      'impact',
      'who',
      tagsArray
    );
    const updatedChallenge = response.body.data.updateChallenge;

    // Act
    const getChallengeDatas = await getChallengeData(challengeId);

    // Assert
    expect(response.status).toBe(200);
    expect(updatedChallenge.displayName).toEqual(challengeName + 'change');
    expect(updatedChallenge.context.tagline).toEqual(taglineText);
    expect(updatedChallenge.tagset.tags).toEqual(tagsArray);
    expect(getChallengeDatas.body.data.ecoverse.challenge.displayName).toEqual(
      challengeName + 'change'
    );
    expect(
      getChallengeDatas.body.data.ecoverse.challenge.context.tagline
    ).toEqual(taglineText);
    expect(getChallengeDatas.body.data.ecoverse.challenge.tagset.tags).toEqual(
      tagsArray
    );
  });

  test('should add challange lead to organisation', async () => {
    // Act
    const response = await addChallengeLeadToOrganisationMutation(
      organisationIdService,
      challengeId
    );
    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data.assignChallengeLead.id).toEqual(challengeId);
  });

  test('should add different challange leads to same organisation', async () => {
    // Arrange
    const responseCreateSecondChallenge = await createChallangeMutation(
      challengeName + 'second',
      uniqueTextId + 's'
    );
    const secondChallengeId =
      responseCreateSecondChallenge.body.data.createChallenge.id;

    // Act
    const responseFirstChallengeLead = await addChallengeLeadToOrganisationMutation(
      organisationIdService,
      challengeId
    );

    const responseSecondhallengeLead = await addChallengeLeadToOrganisationMutation(
      organisationIdService,
      secondChallengeId
    );

    // Assert
    expect(responseFirstChallengeLead.status).toBe(200);
    expect(responseFirstChallengeLead.body.data.assignChallengeLead.id).toEqual(
      challengeId
    );
    expect(responseSecondhallengeLead.status).toBe(200);
    expect(responseSecondhallengeLead.body.data.assignChallengeLead.id).toEqual(
      secondChallengeId
    );
  });

  test('should add challange lead to 2 organisations', async () => {
    // Arrange
    const createOrganisationResponse = await createOrganisationMutation(
      organisationName,
      uniqueTextId + 'k'
    );
    organisationId = createOrganisationResponse.body.data.createOrganisation.id;

    // Act
    const responseFirstOrganisation = await addChallengeLeadToOrganisationMutation(
      organisationIdService,
      challengeId
    );

    const responseSecondOrganisation = await addChallengeLeadToOrganisationMutation(
      organisationId,
      challengeId
    );

    // Assert
    expect(responseFirstOrganisation.status).toBe(200);
    expect(responseFirstOrganisation.body.data.assignChallengeLead.id).toEqual(
      challengeId
    );
    expect(responseSecondOrganisation.status).toBe(200);
    expect(responseSecondOrganisation.body.data.assignChallengeLead.id).toEqual(
      challengeId
    );
  });

  test('should throw error, when try to add the same challnge to organisation as a lead ', async () => {
    // Act
    const responseOne = await addChallengeLeadToOrganisationMutation(
      organisationIdService,
      challengeId
    );

    const responseTwo = await addChallengeLeadToOrganisationMutation(
      organisationIdService,
      challengeId
    );

    // Assert
    expect(responseOne.status).toBe(200);
    expect(responseOne.body.data.assignChallengeLead.id).toEqual(challengeId);
    expect(responseTwo.status).toBe(200);
    expect(responseTwo.text).toContain(
      `Challenge ${uniqueTextId} already has an organisation with the provided organisation ID: ${organisationIdService}`
    );
  });

  test('should remove challange lead from organisation', async () => {
    // Act
    const responseAddCL = await addChallengeLeadToOrganisationMutation(
      organisationIdService,
      challengeId
    );

    // Act
    const responseRemoveCL = await removeChallengeLeadFromOrganisationMutation(
      organisationIdService,
      challengeId
    );

    // Assert
    expect(responseAddCL.status).toBe(200);
    expect(responseRemoveCL.status).toBe(200);
    expect(responseAddCL.body.data.assignChallengeLead.id).toEqual(challengeId);
    expect(responseRemoveCL.body.data.removeChallengeLead.id).toEqual(
      challengeId
    );
  });
});
