import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  createUserDetailsMutation,
  removeUserMutation,
  updateUserMutation,
} from './user.request.params';
import { AppModule } from '../../src/app.module';
import { graphqlRequest } from '../utils/graphql.request';
import '../utils/array.matcher';

let userName = '';
let userId = '';
let userPhone = '';
let userEmail = '';

let userNameAfterUpdate = '';
let phoneAfterUpdate = '';
let emailAfterUpdate = '';

beforeEach(() => {
  userName = 'testUser ' + Math.random().toString();
  userPhone = 'userPhone ' + Math.random().toString();
  userEmail = Math.random().toString() + '@test.com';
});
let app: INestApplication;

beforeAll(async () => {
  const testModule: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = testModule.createNestApplication();
  await app.init();
});

afterAll(async () => {
  await app.close();
});

describe('Update user', () => {
  beforeEach(() => {
    userNameAfterUpdate = 'testUserAfterUpdate-Name' + Math.random().toString();
    phoneAfterUpdate = 'testUserAfterUpdate-Phone' + Math.random().toString();
    emailAfterUpdate = 'testUserAfterUpdate-Email' + Math.random().toString();
  });

  afterEach(async () => {
    await removeUserMutation(userId, app);
  });

  test('should update user "name" only', async () => {
    // Arrange
    const responseCreateUser = await createUserDetailsMutation(
      userName,
      userPhone,
      userEmail,
      app
    );
    userId = responseCreateUser.body.data.createUser.id;

    // Act
    const responseUpdateUser = await updateUserMutation(
      userId,
      userNameAfterUpdate,
      userPhone,
      app
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
      requestParamsQueryUser,
      app
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
      userEmail,
      app
    );
    userId = responseCreateUser.body.data.createUser.id;

    // Act
    const responseUpdateUser = await updateUserMutation(
      userId,
      userName,
      phoneAfterUpdate,
      app
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
      requestParamsQueryUser,
      app
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
      userEmail,
      app
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
    const responseUpdateUser = await graphqlRequest(
      updateUserRequestParams,
      app
    );

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
      userEmail,
      app
    );
    userId = responseCreateUser.body.data.createUser.id;

    // Act
    const responseUpdateUser = await updateUserMutation(
      userId,
      userNameAfterUpdate,
      userPhone,
      app
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
      requestParamsQueryUsers,
      app
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
