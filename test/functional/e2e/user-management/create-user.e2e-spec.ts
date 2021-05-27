import {
  createUserMutation,
  createUserMutationWithParams,
  getUsersProfile,
  removeUserMutation,
} from './user.request.params';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';
import { TestUser } from '../../../utils/token.helper';
import { userData } from '@test/utils/common-params';

let userFirstName = '';
let userLastName = '';
let userName = '';
let userId = '';
let userPhone = '';
let userEmail = '';
let uniqueId = '';

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
});

afterAll(async () => {
  if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
});

beforeEach(() => {
  uniqueId = Math.random()
    .toString(12)
    .slice(-6);
  userName = `testuser${uniqueId}`;
  userFirstName = `FirstName ${uniqueId}`;
  userLastName = `LastName ${uniqueId}`;
  userPhone = `userPhone ${uniqueId}`;
  userEmail = `${uniqueId}@test.com`;
});

describe('Create User', () => {
  afterEach(async () => {
    await removeUserMutation(userId);
  });

  test('should create a user', async () => {
    // Act
    const response = await createUserMutation(userName);
    userId = response.body.data.createUser.id;

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data.createUser.displayName).toEqual(userName);
  });

  test('should throw error - same user is created twice', async () => {
    // Arrange
    const response = await createUserMutation(userName);
    userId = response.body.data.createUser.id;

    // Act
    const responseSecondTime = await createUserMutation(userName);

    // Assert
    expect(responseSecondTime.status).toBe(200);
    expect(responseSecondTime.text).toContain(
      `Unable to create User: the provided nameID is already taken: ${userName}`
    );
  });

  test('should query created user', async () => {
    // Arrange
    const response = await createUserMutation(userName);
    userId = response.body.data.createUser.id;
    let createdUserData = response.body.data.createUser;

    // Act
    const getUserData = await getUsersProfile(userId);

    // Assert
    expect(getUserData.status).toBe(200);
    expect(getUserData.body.data.user).toEqual(createdUserData);
  });

  test('should throw error - create user with ID instead of name', async () => {
    // Arrange
    const requestParams = {
      operationName: 'CreateUser',
      query: `mutation CreateUser($userData: UserInput!) {createUser(ID: id) {  ${userData} }}`,
      variables: {
        userData: {
          id: 12,
        },
      },
    };

    // Act
    const responseQuery = await graphqlRequestAuth(
      requestParams,
      TestUser.GLOBAL_ADMIN
    );

    // Assert
    expect(responseQuery.status).toBe(400);
  });

  test.skip('should throw error - create user with LONG NAME', async () => {
    // Act
    const response = await createUserMutationWithParams(
      'very loooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooong name',
      userEmail
    );

    // Assert
    expect(response.status).toBe(200);
    expect(response.text).toContain(
      'property name has failed the following constraints: maxLength'
    );
  });

  test('should throw error - create user with invalid email', async () => {
    // Act
    const response = await createUserMutationWithParams(userName, 'testEmail');

    // Assert
    expect(response.status).toBe(200);
    expect(response.text).toContain(
      'property email has failed the following constraints: isEmail'
    );
  });
});
