import {
  createChallangeMutation,
  getChallenge,
  getChallengeUsers,
  updateChallangeMutation,
} from './challenge.request.params';
import { graphqlRequest } from '../utils/graphql.request';
import '../utils/array.matcher';
import { appSingleton } from '../utils/app.singleton';
import { createGroupMutation, getGroup } from '../group/group.request.params';
import {
  createUserDetailsMutation,
  assignGroupFocalPointMutation,
} from '../user/user.request.params';

let userName = '';
let userId = '';
let userPhone = '';
let userEmail = '';
let groupName = '';

let challengeName = '';
let challengeId = '';
let uniqueTextId = '';
let uniqueId = Math.random().toString();
beforeEach(async () => {
  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  challengeName = `testChallenge ${uniqueTextId}`;
  userName = `testUser ${uniqueTextId}`;
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
  // Enable the test after bug fix: https://app.zenhub.com/workspaces/cherrytwist-5ecb98b262ebd9f4aec4194c/issues/cherrytwist/server/398
  test.skip('should add "user" to "group" as focal point', async () => {
    // Arrange

    // Create a challenge and get the created GroupId created within it
    const responseCreateChallenge = await createChallangeMutation(
      challengeName,
      uniqueTextId
    );
    const challengeGroupId =
      responseCreateChallenge.body.data.createChallenge.groups[0].id;

    // Create first User
    const responseCreateUserOne = await createUserDetailsMutation(
      userName,
      userPhone,
      userEmail
    );
    const firstUserId = responseCreateUserOne.body.data.createUser.id;
    const firstUserName = responseCreateUserOne.body.data.createUser.name;

    // Create second User
    const responseCreateUserTwo = await createUserDetailsMutation(
      userName,
      userPhone,
      userEmail + userEmail
    );
    const secondUserName = responseCreateUserTwo.body.data.createUser.name;

    // Assign first User as a focal point to the group
    const responseAddUserToGroup = await assignGroupFocalPointMutation(
      firstUserId,
      challengeGroupId
    );

    // Query the group focal point
    const responseGroupQuery = await getGroup(challengeGroupId);
    const groupFocalPoint = responseGroupQuery.body.data.group.focalPoint;

    // Assert
    expect(responseAddUserToGroup.status).toBe(200);
    expect(
      responseAddUserToGroup.body.data.assignGroupFocalPoint.focalPoint.name
    ).toEqual(userName);

    expect(groupFocalPoint).toEqual(firstUserName);
    expect(groupFocalPoint).not.toEqual(secondUserName);
  });

  test('should not result unassigned users (contributors) to a challenge', async () => {
    // Arrange

    // Create a challenge and get its id
    const responseCreateChallenge = await createChallangeMutation(
      challengeName,
      uniqueTextId
    );
    const challengeId = responseCreateChallenge.body.data.createChallenge.id;

    // Create a User
    const responseCreateUserOne = await createUserDetailsMutation(
      userName,
      userPhone,
      userEmail
    );

    // Get users assossiated with challenge or groups within challenge
    const responseGroupQuery = await getChallengeUsers(challengeId);

    // Assert
    expect(responseCreateUserOne.status).toBe(200);
    expect(responseGroupQuery.status).toBe(200);
    expect(responseGroupQuery.body.data.challenge.contributors).toHaveLength(0);
    expect(responseGroupQuery.body.data.challenge.groups[0].focalPoint).toEqual(
      null
    );
    expect(
      responseGroupQuery.body.data.challenge.groups[0].members
    ).toHaveLength(0);
  });

  // Enable the test after the bug is fixed: https://app.zenhub.com/workspaces/cherrytwist-5ecb98b262ebd9f4aec4194c/issues/cherrytwist/server/406
  test.skip('should not be able to modify challenge name to allready existing challenge name', async () => {
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
      `Challenge with such name: '${secondchallengeName}' already exists.`
    );
  });

  // Enable the test after the bug is fixed: https://app.zenhub.com/workspaces/cherrytwist-5ecb98b262ebd9f4aec4194c/issues/cherrytwist/server/406
  test.skip('should thow error - creating 2 challenges with same name', async () => {
    // Act
    await createChallangeMutation(challengeName, uniqueTextId);
    const response = await createChallangeMutation('1', uniqueTextId);
    challengeId = response.body.data.createChallenge.id;
    console.log(response.body);
    console.log(challengeName);
    console.log(response.text);

    // Assert
    expect(response.status).toBe(200);
    // expect(response.body.data.createChallenge.name).toEqual(
    //   `Challenge with name: ${challengeName} is already created`
    // );
  });
});
