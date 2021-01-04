import {
  createUserDetailsMutation,
  removeUserMutation,
  updateUserMutation,
} from './user.request.params';
import { graphqlRequest } from '@utils/graphql.request';
import '@utils/array.matcher';
import { appSingleton } from '@utils/app.singleton';

let userName = '';
let userId = '';
let userPhone = '';
let userEmail = '';

let userNameAfterUpdate = '';
let phoneAfterUpdate = '';
let emailAfterUpdate = '';

const uniqueId = Math.random().toString();

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
});

afterAll(async () => {
  if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
});

beforeEach(() => {
  userName = `testUser ${uniqueId}`;
  userPhone = `userPhone ${uniqueId}`;
  userEmail = `${uniqueId}@test.com`;
});

describe.skip('Update user', () => {
  beforeEach(() => {
    userNameAfterUpdate = `testUserAfterUpdate-Name_${uniqueId}`;
    phoneAfterUpdate = `testUserAfterUpdate-Phone_${uniqueId}`;
    emailAfterUpdate = `testUserAfterUpdate-Email_${uniqueId}@test.com`;
  });

  afterEach(async () => {
    await removeUserMutation(userId);
  });

  test('should update user "name" only', async () => {
    // Arrange
    const responseCreateUser = await createUserDetailsMutation(
      userName,
      userPhone,
      userEmail
    );
    userId = responseCreateUser.body.data.createUser.id;

    // Act
    const responseUpdateUser = await updateUserMutation(
      userId,
      userNameAfterUpdate,
      userPhone
    );

    const requestParamsQueryUser = {
      query: `{user(ID: "${userId}") {
          name
          id
          email
          phone
        }}`,
    };
    const responseParamsQueryUser = await graphqlRequest(
      requestParamsQueryUser
    );

    // Assert
    expect(responseParamsQueryUser.status).toBe(200);
    expect(responseCreateUser.body.data.createUser).not.toEqual(
      responseUpdateUser.body.data.updateUser
    );
    expect(responseParamsQueryUser.body.data.user).toEqual(
      responseUpdateUser.body.data.updateUser
    );
  });

  test('should update user "phone" only', async () => {
    // Arrange
    const responseCreateUser = await createUserDetailsMutation(
      userName,
      userPhone,
      userEmail
    );
    userId = responseCreateUser.body.data.createUser.id;

    // Act
    const responseUpdateUser = await updateUserMutation(
      userId,
      userName,
      phoneAfterUpdate
    );

    const requestParamsQueryUser = {
      query: `{user(ID: "${userId}") {
          name
          id
          email
          phone
        }}`,
    };
    const responseParamsQueryUser = await graphqlRequest(
      requestParamsQueryUser
    );

    // Assert
    expect(responseParamsQueryUser.status).toBe(200);
    expect(responseCreateUser.body.data.createUser).not.toEqual(
      responseUpdateUser.body.data.updateUser
    );
    expect(responseParamsQueryUser.body.data.user).toEqual(
      responseUpdateUser.body.data.updateUser
    );
  });

  test('should throw message for updating user "email"', async () => {
    // Arrange
    const responseCreateUser = await createUserDetailsMutation(
      userName,
      userPhone,
      userEmail
    );
    userId = responseCreateUser.body.data.createUser.id;

    // Act
    const updateUserRequestParams = {
      operationName: 'UpdateUser',
      query: `mutation UpdateUser($userID: Float!, $userData: UserInput!) {
            updateUser(userID: $userID, userData: $userData) {
              id
              name
              phone
              email
            }
          }`,
      variables: {
        userID: parseFloat(userId),
        userData: {
          name: userName,
          phone: userPhone,
          email: emailAfterUpdate,
        },
      },
    };
    const responseUpdateUser = await graphqlRequest(updateUserRequestParams);

    // Assert
    expect(responseUpdateUser.status).toBe(200);
    expect(responseUpdateUser.text).toContain(
      `Updating of email addresses is not supported: ${userId}`
    );
  });

  test('should update user and be available in "users" query', async () => {
    // Arrange
    const responseCreateUser = await createUserDetailsMutation(
      userName,
      userPhone,
      userEmail
    );
    userId = responseCreateUser.body.data.createUser.id;

    // Act
    const responseUpdateUser = await updateUserMutation(
      userId,
      userNameAfterUpdate,
      userPhone
    );

    const requestParamsQueryUsers = {
      query: `{users {
          name
          id
          email
          phone
        }}`,
    };
    const responseParamsQueryUsers = await graphqlRequest(
      requestParamsQueryUsers
    );

    // Assert
    expect(responseParamsQueryUsers.status).toBe(200);
    expect(responseParamsQueryUsers.body.data.users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: userEmail,
          id: userId,
          name: userNameAfterUpdate,
          phone: userPhone,
        }),
      ])
    );
  });
});
