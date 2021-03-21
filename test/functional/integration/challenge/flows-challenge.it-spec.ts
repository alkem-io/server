import {
  createChallangeMutation,
  getChallengeUsers,
  updateChallangeMutation,
} from './challenge.request.params';
import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';
import { getGroup } from '@test/functional/integration/group/group.request.params';
import { assignGroupFocalPointMutation } from '@test/functional/e2e/user-management/user.request.params';
import { createOpportunityOnChallengeMutation } from '../opportunity/opportunity.request.params';

const userNameOne = 'Evgeni Dimitrov';
const userIdOne = '6';
const userNameTwo = 'Valntin Yanakiev';
let userPhone = '';
let userEmail = '';
let challengeName = '';
let challengeId = '';
let opportunityName = '';
let opportunityTextId = '';
let uniqueTextId = '';
beforeEach(async () => {
  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  challengeName = `testChallenge ${uniqueTextId}`;
  opportunityName = `opportunityName ${uniqueTextId}`;
  opportunityTextId = `${uniqueTextId}`;
  userPhone = `userPhone ${uniqueTextId}`;
  userEmail = `${uniqueTextId}@test.com`;
});

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
});

afterAll(async () => {
  if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
});

describe('Create Challenge', () => {
  test('should add "user" to "group" as focal point', async () => {
    // Arrange

    // Create a challenge and get the created GroupId created within it
    const responseCreateChallenge = await createChallangeMutation(
      challengeName,
      uniqueTextId
    );
    challengeId = responseCreateChallenge.body.data.createChallenge.id;
    const challengeGroupId =
      responseCreateChallenge.body.data.createChallenge.community.groups[0].id;

    // Act

    // Assign first User as a focal point to the group
    const responseAddUserToGroup = await assignGroupFocalPointMutation(
      userIdOne,
      challengeGroupId
    );

    // Query focal point through challenge group
    const responseChallengeGroupQuery = await getChallengeUsers(challengeId);
    const groupFocalPointFromChallenge =
      responseChallengeGroupQuery.body.data.challenge.community.groups[0].focalPoint.name;

    // Query focal point directly from group
    const responseGroupQuery = await getGroup(challengeGroupId);
    const groupFocalPoint = responseGroupQuery.body.data.group.focalPoint.name;

    // Assert
    expect(responseAddUserToGroup.status).toBe(200);
    expect(
      responseAddUserToGroup.body.data.assignGroupFocalPoint.focalPoint.name
    ).toEqual(userNameOne);

    expect(groupFocalPointFromChallenge).toEqual(userNameOne);
    expect(groupFocalPointFromChallenge).not.toEqual(userNameTwo);
    expect(groupFocalPoint).toEqual(userNameOne);
    expect(groupFocalPoint).not.toEqual(userNameTwo);
  });

  test('should not result unassigned users to a challenge', async () => {
    // Arrange

    // Create a challenge and get its id
    const responseCreateChallenge = await createChallangeMutation(
      challengeName,
      uniqueTextId
    );
    const challengeId = responseCreateChallenge.body.data.createChallenge.id;

    // Get users assossiated with challenge or groups within challenge
    const responseGroupQuery = await getChallengeUsers(challengeId);

    // Assert
    //expect(responseCreateUserOne.status).toBe(200);
    expect(responseGroupQuery.status).toBe(200);
    expect(responseGroupQuery.body.data.challenge.community.members).toHaveLength(0);
    expect(responseGroupQuery.body.data.challenge.community.groups[0].focalPoint).toEqual(
      null
    );
    expect(
      responseGroupQuery.body.data.challenge.community.groups[0].members
    ).toHaveLength(0);
  });

  test('should not be able to modify challenge name to allready existing challenge name and/or textId', async () => {
    // Arrange

    // Create first challenge and get its id and name
    const responseFirstChallenge = await createChallangeMutation(
      challengeName,
      uniqueTextId
    );
    const firstChallengeId =
      responseFirstChallenge.body.data.createChallenge.id;

    // Create second challenge and get its id and name
    const responseSecondChallenge = await createChallangeMutation(
      challengeName + challengeName,
      uniqueTextId + uniqueTextId
    );
    const secondchallengeName =
      responseSecondChallenge.body.data.createChallenge.name;

    // Act
    // Get users assossiated with challenge or groups within challenge
    const responseUpdateChallenge = await updateChallangeMutation(
      firstChallengeId,
      secondchallengeName
    );

    // Assert
    expect(responseUpdateChallenge.status).toBe(200);
    expect(responseUpdateChallenge.text).toContain(
      `Unable to update challenge: already have a challenge with the provided name (${secondchallengeName})`
    );
  });

  test('should throw error - creating 2 challenges with same name', async () => {
    // Arrange
    await createChallangeMutation(challengeName, uniqueTextId);

    // Act
    const response = await createChallangeMutation(
      challengeName,
      `${uniqueTextId}-2`
    );

    // Assert
    expect(response.status).toBe(200);
    expect(response.text).toContain(
      `Unable to create challenge: already have a challenge with the provided name (${challengeName})`
    );
  });

  test('should throw error - creating 2 challenges with different name and same textId', async () => {
    // Arrange
    await createChallangeMutation(challengeName, uniqueTextId);

    // Act
    const response = await createChallangeMutation(
      challengeName + challengeName,
      uniqueTextId
    );

    // Assert
    expect(response.status).toBe(200);
    expect(response.text).toContain(
      'property textID has failed the following constraints: isUniqueTextId'
    );
  });

  test('should add "opportunity" to "challenge"', async () => {
    // Arrange
    // Create a challenge and get its challengeId
    const responseCreateChallenge = await createChallangeMutation(
      challengeName,
      uniqueTextId
    );
    challengeId = responseCreateChallenge.body.data.createChallenge.id;

    // Act
    // Add opportunity to a challenge
    const responseCreateOpportunityOnChallenge = await createOpportunityOnChallengeMutation(
      challengeId,
      opportunityName,
      opportunityTextId
    );

    const oportunityNameResponse =
      responseCreateOpportunityOnChallenge.body.data
        .createOpportunityOnChallenge.name;
    const oportunityIdResponse =
      responseCreateOpportunityOnChallenge.body.data
        .createOpportunityOnChallenge.id;

    // Assert
    expect(responseCreateOpportunityOnChallenge.status).toBe(200);
    expect(oportunityNameResponse).toEqual(opportunityName);
    expect(oportunityIdResponse).not.toBeNull;
  });
});
