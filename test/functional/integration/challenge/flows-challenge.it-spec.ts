import {
  createChallangeMutation,
  getChallengeData,
  updateChallangeMutation,
} from './challenge.request.params';
import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';
import { getGroup } from '@test/functional/integration/group/group.request.params';
import { assignGroupFocalPointMutation } from '@test/functional/e2e/user-management/user.request.params';
import { createChildChallengeMutation } from '../opportunity/opportunity.request.params';

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
let challengeGroupId = '';
let challengeCommunityId = '';
beforeEach(async () => {
  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  challengeName = `testChallenge ${uniqueTextId}`;
  opportunityName = `opportunityName ${uniqueTextId}`;
  opportunityTextId = `opp${uniqueTextId}`;
  userPhone = `userPhone ${uniqueTextId}`;
  userEmail = `${uniqueTextId}@test.com`;

  // Create a challenge and get the created GroupId created within it
  const responseCreateChallenge = await createChallangeMutation(
    challengeName,
    uniqueTextId
  );
  challengeId = responseCreateChallenge.body.data.createChallenge.id;
  challengeCommunityId =
    responseCreateChallenge.body.data.createChallenge.community.id;
});

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
});

afterAll(async () => {
  if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
});

describe('Flows challenge', () => {
  test.skip('should add "user" to "group" as focal point', async () => {
    // Act
    // Assign first User as a focal point to the group
    const responseAddUserToGroup = await assignGroupFocalPointMutation(
      userIdOne,
      challengeGroupId
    );

    // Query focal point through challenge group
    const responseChallengeGroupQuery = await getChallengeData(challengeId);
    const groupFocalPointFromChallenge =
      responseChallengeGroupQuery.body.data.ecoverse.challenge.community
        .groups[0].focalPoint.name;

    // Query focal point directly from group
    const responseGroupQuery = await getGroup(challengeGroupId);
    const groupFocalPoint =
      responseGroupQuery.body.data.ecoverse.group.focalPoint.name;

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
    // Act
    // Get users assossiated with challenge or groups within challenge
    const responseGroupQuery = await getChallengeData(challengeId);

    // Assert
    //expect(responseCreateUserOne.status).toBe(200);
    expect(responseGroupQuery.status).toBe(200);
    expect(
      responseGroupQuery.body.data.ecoverse.challenge.community.members
    ).toHaveLength(0);
  });

  test('should  modify challenge name to allready existing challenge name and/or textId', async () => {
    // Arrange
    // Create second challenge and get its id and name
    const responseSecondChallenge = await createChallangeMutation(
      challengeName + challengeName,
      uniqueTextId + uniqueTextId
    );
    const secondchallengeName =
      responseSecondChallenge.body.data.createChallenge.displayName;

    // Act
    const responseUpdateChallenge = await updateChallangeMutation(
      challengeId,
      secondchallengeName,
      'taglineText',
      'background',
      'vision',
      'impact',
      'who',
      'tagsArray'
    );
    // Assert
    expect(responseUpdateChallenge.status).toBe(200);
    expect(
      responseUpdateChallenge.body.data.updateChallenge.displayName
    ).toEqual(secondchallengeName);
  });

  test('should creating 2 challenges with same name', async () => {
    // Act
    // Create second challenge with same name
    const response = await createChallangeMutation(
      challengeName,
      `${uniqueTextId}-2`
    );

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data.createChallenge.displayName).toContain(
      challengeName
    );
  });

  test('should throw error - creating 2 challenges with different name and same textId', async () => {
    // Act
    // Create second challenge with same textId
    const response = await createChallangeMutation(
      challengeName + challengeName,
      uniqueTextId
    );

    // Assert
    expect(response.status).toBe(200);
    expect(response.text).toContain(
      `Unable to create Challenge: the provided nameID is already taken: ${uniqueTextId}`
    );
  });

  test('should add "childChallenge" to "challenge"', async () => {
    // Act
    // Add opportunity to a challenge
    const responseCreateChildChallenge = await createChildChallengeMutation(
      challengeId,
      opportunityName,
      opportunityTextId
    );
    const childChallengeNameResponse =
      responseCreateChildChallenge.body.data.createChildChallenge.displayName;
    const childChallengeIdResponse =
      responseCreateChildChallenge.body.data.createChildChallenge.id;

    // Assert
    expect(responseCreateChildChallenge.status).toBe(200);
    expect(childChallengeNameResponse).toEqual(opportunityName);
    expect(childChallengeIdResponse).not.toBeNull;
  });
});
