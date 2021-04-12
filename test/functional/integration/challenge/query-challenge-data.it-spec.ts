import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';
import {
  createChallangeMutation,
  getChallengeOpportunity,
} from '@test/functional/integration/challenge/challenge.request.params';
import {
  createOpportunityOnChallengeMutation,
  queryOpportunity,
} from '../opportunity/opportunity.request.params';
import {
  addChallengeLeadToOrganisationMutation,
  getChallenge,
  getChallengeGroups,
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
let challengeState = '';
let organisationName = '';
let organisationId = '';
let organisationIdService = '';
let taglineText = '';
const refName = 'refName';
const refUri = 'https://test.com';
const tagsArray = ['tag1', 'tag2'];
let groupName = '';
let userId = '';
let refId = '';

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
  opportunityTextId = `${uniqueTextId}`;
  groupName = `groupName ${uniqueTextId}`;
  challengeState = `challengeState ${uniqueTextId}`;
  organisationName = `organisationName ${uniqueTextId}`;
  taglineText = `taglineText ${uniqueTextId}`;
  const responseCreateChallenge = await createChallangeMutation(
    challengeName,
    uniqueTextId
  );
  challengeId = responseCreateChallenge.body.data.createChallenge.id;
  refId =
    responseCreateChallenge.body.data.createChallenge.context.references[0].id;
});

describe('Query Challenge data', () => {
  test('should query groups through challenge', async () => {
    // Act
    const responseQueryData = await getChallengeGroups(challengeId);

    // Assert
    expect(
      responseQueryData.body.data.ecoverse.challenge.community.groups
    ).toHaveLength(1);
    expect(
      responseQueryData.body.data.ecoverse.challenge.community.groups[0].name
    ).toEqual('members');
  });

  test('should query opportunity through challenge', async () => {
    // Act
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunityOnChallengeMutation(
      challengeId,
      opportunityName,
      opportunityTextId
    );
    opportunityId =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity.id;

    // Query Opportunity data through Challenge query
    const responseQueryData = await getChallengeOpportunity(challengeId);

    // Assert
    expect(
      responseQueryData.body.data.ecoverse.challenge.opportunities
    ).toHaveLength(1);
    expect(
      responseQueryData.body.data.ecoverse.challenge.opportunities[0].name
    ).toEqual(opportunityName);
    expect(
      responseQueryData.body.data.ecoverse.challenge.opportunities[0].textID
    ).toEqual(opportunityTextId);
    expect(
      responseQueryData.body.data.ecoverse.challenge.opportunities[0].id
    ).toEqual(opportunityId);
  });

  test('should create opportunity and query the data', async () => {
    // Act
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunityOnChallengeMutation(
      challengeId,
      opportunityName,
      opportunityTextId
    );

    const createOpportunityData =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity;

    opportunityId =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity.id;

    // Query Opportunity data
    const requestQueryOpportunity = await queryOpportunity(opportunityId);
    const requestOpportunityData =
      requestQueryOpportunity.body.data.ecoverse.opportunity;

    // Assert
    expect(responseCreateOpportunityOnChallenge.status).toBe(200);
    expect(createOpportunityData).toEqual(requestOpportunityData);
  });

  test('should update a challenge', async () => {
    // Arrange
    const response = await updateChallangeMutation(
      challengeId,
      challengeName + 'change',
      challengeState + 'change',
      taglineText,
      'background',
      'vision',
      'impact',
      'who',
      refName,
      refUri,
      tagsArray,
      refId
    );
    const updatedChallenge = response.body.data.updateChallenge;

    // Act
    const getChallengeData = await getChallenge(challengeId);

    // Assert
    expect(response.status).toBe(200);
    expect(updatedChallenge.name).toEqual(challengeName + 'change');
    expect(updatedChallenge.state).toEqual(challengeState + 'change');
    expect(updatedChallenge.context.tagline).toEqual(taglineText);
    expect(updatedChallenge.tagset.tags).toEqual(tagsArray);
    expect(getChallengeData.body.data.ecoverse.challenge.name).toEqual(
      challengeName + 'change'
    );
    expect(getChallengeData.body.data.ecoverse.challenge.state).toEqual(
      challengeState + 'change'
    );
    expect(
      getChallengeData.body.data.ecoverse.challenge.context.tagline
    ).toEqual(taglineText);
    expect(getChallengeData.body.data.ecoverse.challenge.tagset.tags).toEqual(
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
    expect(response.body.data.addChallengeLead).toEqual(true);
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
    expect(responseFirstChallengeLead.body.data.addChallengeLead).toEqual(true);
    expect(responseSecondhallengeLead.status).toBe(200);
    expect(responseSecondhallengeLead.body.data.addChallengeLead).toEqual(true);
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
    expect(responseFirstOrganisation.body.data.addChallengeLead).toEqual(true);
    expect(responseSecondOrganisation.status).toBe(200);
    expect(responseSecondOrganisation.body.data.addChallengeLead).toEqual(true);
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
    expect(responseOne.body.data.addChallengeLead).toEqual(true);
    expect(responseTwo.status).toBe(200);
    expect(responseTwo.text).toContain(
      `Community ${challengeId} already has an organisation with the provided organisation ID: ${organisationIdService}`
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
    expect(responseAddCL.body.data.addChallengeLead).toEqual(true);
    expect(responseRemoveCL.body.data.removeChallengeLead).toEqual(true);
  });
});
