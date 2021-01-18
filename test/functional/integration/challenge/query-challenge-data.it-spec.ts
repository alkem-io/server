import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';
import {
  createChallangeMutation,
  getChallengeOpportunity,
} from '@test/functional/integration/challenge/challenge.request.params';
import {
  addUserToOpportunityMutation,
  createOpportunityOnChallengeMutation,
  queryOpportunity,
  queryOpportunityGroups,
} from '../opportunity/opportunity.request.params';
import {
  addChallengeChallengeLeadToOrganisationMutation,
  addUserToChallangeMutation,
  getChallenge,
  getChallengeGroups,
  removeChallengeChallengeLeadFromOrganisationMutation,
  updateChallangeMutation,
} from './challenge.request.params';
import { createOrganisationMutation } from '../organisation/organisation.request.params';

let opportunityName = '';
let opportunityTextId = '';
let opportunityId = '';
let challengeName = '';
let challengeId = '';
let uniqueTextId = '';
let challengeState = '';
let organisationName = '';
let taglineText = '';
let refName = 'refName';
let refUri = 'https://test.com';
let tagsArray = ['tag1', 'tag2'];
let groupName = '';

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
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
});

describe('Query Challenge data', () => {
  test('should query groups through challenge', async () => {
    // Act
    const responseQueryData = await getChallengeGroups(challengeId);

    // Assert
    expect(responseQueryData.body.data.challenge.groups).toHaveLength(1);
    expect(responseQueryData.body.data.challenge.groups[0].name).toEqual(
      'members'
    );
  });

  test('should throw error query groups for wrong challengeId', async () => {
    // Act
    const responseQueryData = await getChallengeGroups(7000);

    // Assert
    expect(responseQueryData.text).toContain(
      `Unable to find challenge with ID: 7000`
    );
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
      responseCreateOpportunityOnChallenge.body.data
        .createOpportunityOnChallenge.id;

    // Query Opportunity data through Challenge query
    const responseQueryData = await getChallengeOpportunity(challengeId);

    // Assert
    expect(responseQueryData.body.data.challenge.opportunities).toHaveLength(1);
    expect(responseQueryData.body.data.challenge.opportunities[0].name).toEqual(
      opportunityName
    );
    expect(
      responseQueryData.body.data.challenge.opportunities[0].textID
    ).toEqual(opportunityTextId);
    expect(responseQueryData.body.data.challenge.opportunities[0].id).toEqual(
      opportunityId
    );
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

  test('should add user to challenge and to opportunity of it ', async () => {
    // Arrange
    await addUserToChallangeMutation(challengeId, '1');

    // Act
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunityOnChallengeMutation(
      challengeId,
      opportunityName,
      opportunityTextId
    );

    opportunityId =
      responseCreateOpportunityOnChallenge.body.data
        .createOpportunityOnChallenge.id;

    const responseAddUserToOpp = await addUserToOpportunityMutation(
      opportunityId,
      1
    );

    // Query Opportunity data
    const requestQueryOpportunity = await queryOpportunityGroups(opportunityId);
    const requestOpportunityData =
      requestQueryOpportunity.body.data.opportunity.groups[0].members;

    // Assert
    expect(requestOpportunityData).toHaveLength(1);
    expect(requestOpportunityData[0].id).toContain(1);
  });

  test('should throw error adding user to opportunity without being part of a challenge ', async () => {
    // Act
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunityOnChallengeMutation(
      challengeId,
      opportunityName,
      opportunityTextId
    );

    opportunityId =
      responseCreateOpportunityOnChallenge.body.data
        .createOpportunityOnChallenge.id;

    const responseAddUserToOpp = await addUserToOpportunityMutation(
      opportunityId,
      1
    );

    // Query Opportunity data
    const requestQueryOpportunity = await queryOpportunityGroups(opportunityId);
    const requestOpportunityData =
      requestQueryOpportunity.body.data.opportunity.groups[0].members;

    // Assert
    expect(requestOpportunityData).toHaveLength(0);
    expect(responseAddUserToOpp.text).toContain(
      `User (1) is not a member of parent challenge: ${challengeId}`
    );
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
      tagsArray
    );
    console.log(response.body)
    const updatedChallenge = response.body.data.updateChallenge;

    // Act
    const getChallengeData = await getChallenge(challengeId);

    // Assert
    expect(response.status).toBe(200);
    expect(updatedChallenge.name).toEqual(challengeName + 'change');
    expect(updatedChallenge.state).toEqual(challengeState + 'change');
    expect(updatedChallenge.context.tagline).toEqual(taglineText);
    expect(updatedChallenge.tagset.tags).toEqual(tagsArray);
    expect(getChallengeData.body.data.challenge.name).toEqual(
      challengeName + 'change'
    );
    expect(getChallengeData.body.data.challenge.state).toEqual(
      challengeState + 'change'
    );
    expect(getChallengeData.body.data.challenge.context.tagline).toEqual(
      taglineText
    );
    expect(getChallengeData.body.data.challenge.tagset.tags).toEqual(tagsArray);
  });

  test('should add challange lead to organisation', async () => {
    // Act
    const response = await addChallengeChallengeLeadToOrganisationMutation(
      1,
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
    const responseFirstChallengeLead = await addChallengeChallengeLeadToOrganisationMutation(
      1,
      challengeId
    );

    const responseSecondhallengeLead = await addChallengeChallengeLeadToOrganisationMutation(
      1,
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
      organisationName
    );
    const organisationId =
      createOrganisationResponse.body.data.createOrganisation.id;

    // Act
    const responseFirstOrganisation = await addChallengeChallengeLeadToOrganisationMutation(
      1,
      challengeId
    );

    const responseSecondOrganisation = await addChallengeChallengeLeadToOrganisationMutation(
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
    const responseOne = await addChallengeChallengeLeadToOrganisationMutation(
      1,
      challengeId
    );

    const responseTwo = await addChallengeChallengeLeadToOrganisationMutation(
      1,
      challengeId
    );

    // Assert
    expect(responseOne.status).toBe(200);
    expect(responseOne.body.data.addChallengeLead).toEqual(true);
    expect(responseTwo.status).toBe(200);
    expect(responseTwo.text).toContain(
      `Challenge ${challengeId} already has an organisation with the provided organisation ID: 1`
    );
  });

  test('should remove challange lead from organisation', async () => {
    // Act
    const responseAddCL = await addChallengeChallengeLeadToOrganisationMutation(
      1,
      challengeId
    );

    // Act
    const responseRemoveCL = await removeChallengeChallengeLeadFromOrganisationMutation(
      1,
      challengeId
    );

    // Assert
    expect(responseAddCL.status).toBe(200);
    expect(responseRemoveCL.status).toBe(200);
    expect(responseAddCL.body.data.addChallengeLead).toEqual(true);
    expect(responseRemoveCL.body.data.removeChallengeLead).toEqual(true);
  });
});
