import {
  addUserToChallangeMutation,
  createChallangeMutation,
} from './challenge.request.params';
import '@utils/array.matcher';
import { appSingleton } from '@utils/app.singleton';
import { createGroupOnChallengeMutation } from '@domain/group/group.request.params';
import { createOpportunityOnChallengeMutation } from '@domain/opportunity/opportunity.request.params';

let opportunityName = '';
let opportunityTextId = '';
const userName = 'Evgeni Dimitrov';
const userId = '6';
let groupName = '';
let challengeName = '';
let challengeId = '';
let uniqueTextId = '';
beforeEach(async () => {
  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  challengeName = `testChallenge ${uniqueTextId}`;
  groupName = `groupName ${uniqueTextId}`;
  opportunityName = `opportunityName ${uniqueTextId}`;
  opportunityTextId = `${uniqueTextId}`;
});

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
});

afterAll(async () => {
  if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
});

describe('Other entities to Challenge', () => {
  test('should add "group" to "challenge"', async () => {
    // Arrange
    // Create a challenge and get its challengeId
    const responseCreateChallenge = await createChallangeMutation(
      challengeName,
      uniqueTextId
    );
    challengeId = responseCreateChallenge.body.data.createChallenge.id;

    // Act
    // Add group to a challenge
    const responseCreateGroupOnChallenge = await createGroupOnChallengeMutation(
      groupName,
      challengeId
    );

    const groupNameResponse =
      responseCreateGroupOnChallenge.body.data.createGroupOnChallenge.name;
    const groupIdResponse =
      responseCreateGroupOnChallenge.body.data.createGroupOnChallenge.id;
    const groupMembers =
      responseCreateGroupOnChallenge.body.data.createGroupOnChallenge.members;

    // Assert
    expect(responseCreateGroupOnChallenge.status).toBe(200);
    expect(groupNameResponse).toEqual(groupName);

    expect(groupIdResponse).not.toBeNull;
    expect(groupMembers).toHaveLength(0);
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

  test('should add "user" to "challenge"', async () => {
    // Arrange
    // Create a challenge and get its challengeId
    const responseCreateChallenge = await createChallangeMutation(
      challengeName,
      uniqueTextId
    );
    challengeId = responseCreateChallenge.body.data.createChallenge.id;

    // Act
    // Add user to a challenge
    const responseAddUserToChallenge = await addUserToChallangeMutation(
      challengeId,
      userId
    );
    const userNameAddedToChallenge =
      responseAddUserToChallenge.body.data.addUserToChallenge.members[0].name;
    const userIdAddedToChallenge =
      responseAddUserToChallenge.body.data.addUserToChallenge.members[0].id;

    // Assert
    expect(responseAddUserToChallenge.status).toBe(200);
    expect(userNameAddedToChallenge).toEqual(userName);
    expect(userIdAddedToChallenge).not.toBeNull;
  });

  test('should throw error for adding unexisting "user" to "challenge"', async () => {
    // Arrange
    // Create a challenge and get its challengeId
    const responseCreateChallenge = await createChallangeMutation(
      challengeName,
      uniqueTextId
    );
    challengeId = responseCreateChallenge.body.data.createChallenge.id;

    // Act
    // Add unexisting user to a challenge
    const responseAddUserToChallenge = await addUserToChallangeMutation(
      challengeId,
      '777'
    );
    const responseErrorMessage =
      responseAddUserToChallenge.body.errors[0].message;

    // Assert
    expect(responseAddUserToChallenge.status).toBe(200);
    expect(responseErrorMessage).toEqual(
      'Unable to find exactly one user with ID: 777'
    );
  });

  test('should throw error for adding "user" to unexisting "challenge"', async () => {
    // Act
    // Add user to a challenge
    const responseAddUserToChallenge = await addUserToChallangeMutation(
      777,
      userId
    );
    const responseErrorMessage =
      responseAddUserToChallenge.body.errors[0].message;

    // Assert
    expect(responseAddUserToChallenge.status).toBe(200);
    expect(responseErrorMessage).toEqual(
      'Unable to find challenge with ID: 777'
    );
  });
});
