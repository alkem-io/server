import {
  createChallangeMutation,
  getChallengeUsers,
  updateChallangeMutation,
} from './challenge.request.params';
import '../utils/array.matcher';
import { appSingleton } from '../utils/app.singleton';
import { getGroup } from '../group/group.request.params';
import { assignGroupFocalPointMutation } from '../user/user.request.params';

let userNameOne = 'Evgeni Dimitrov';
let userIdOne = '6';
let userNameTwo = 'Valntin Yanakiev';
let userPhone = '';
let userEmail = '';
let challengeName = '';
let challengeId = '';
let uniqueTextId = '';
beforeEach(async () => {
  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  challengeName = `testChallenge ${uniqueTextId}`;
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
      responseCreateChallenge.body.data.createChallenge.groups[0].id;

    // Act

    // Assign first User as a focal point to the group
    const responseAddUserToGroup = await assignGroupFocalPointMutation(
      userIdOne,
      challengeGroupId
    );

    // Query focal point through challenge group
    const responseChallengeGroupQuery = await getChallengeUsers(challengeId);
    const groupFocalPointFromChallenge =
      responseChallengeGroupQuery.body.data.challenge.groups[0].focalPoint.name;

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

  test('should not result unassigned users (contributors) to a challenge', async () => {
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
    expect(responseGroupQuery.body.data.challenge.contributors).toHaveLength(0);
    expect(responseGroupQuery.body.data.challenge.groups[0].focalPoint).toEqual(
      null
    );
    expect(
      responseGroupQuery.body.data.challenge.groups[0].members
    ).toHaveLength(0);
  });

  test('should not be able to modify challenge name to allready existing challenge name', async () => {
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
      uniqueTextId
    );
    const secondchallengeName =
      responseSecondChallenge.body.data.createChallenge.name;

    // Act
    // Get users assossiated with challenge or groups within challenge
    const responseUpdateChallenge = await updateChallangeMutation(
      firstChallengeId,
      secondchallengeName
    );
    console.log(responseUpdateChallenge.text);

    // Assert
    expect(responseUpdateChallenge.status).toBe(200);
    expect(responseUpdateChallenge.text).toContain(
      `Unable to update challenge: already have a challenge with the provided name (${secondchallengeName})`
    );
  });

  test('should thow error - creating 2 challenges with same name', async () => {
    // Arrange
    await createChallangeMutation(challengeName, uniqueTextId);

    // Act
    const response = await createChallangeMutation(challengeName, uniqueTextId);

    // Assert
    expect(response.status).toBe(200);
    expect(response.text).toContain(
      `Unable to create challenge: already have a challenge with the provided name (${challengeName})`
    );
  });
});
