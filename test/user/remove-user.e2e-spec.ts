import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createUserMutation, removeUserMutation } from './user.request.params';
import { AppModule } from '../../src/app.module';
import { graphqlRequest } from '../utils/graphql.request';
import '../utils/array.matcher';

let userName = '';
let userId = '';
let userPhone = '';
let userEmail = '';

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

describe('Remove user', () => {
  test('should remove created user', async () => {
    // Arrange
    const response = await createUserMutation(userName, app);
    userId = response.body.data.createUser.id;

    // Act
    const responseQuery = await removeUserMutation(userId, app);

    // Assert
    expect(responseQuery.status).toBe(200);
    expect(responseQuery.body.data.removeUser).toBe(true);
  });

  test('should receive a message for removing already removed user', async () => {
    // Arrange
    const response = await createUserMutation(userName, app);
    userId = response.body.data.createUser.id;
    await removeUserMutation(userId, app);

    // Act
    const responseQuery = await removeUserMutation(userId, app);

    // Assert
    expect(responseQuery.status).toBe(200);
    expect(responseQuery.text).toContain(
      `Could not locate specified user: ${userId}`
    );
  });

  test('should receive a message for removing unexisting user', async () => {
    // Act
    const responseQuery = await removeUserMutation(77777, app);

    // Assert
    expect(responseQuery.status).toBe(200);
    expect(responseQuery.text).toContain(
      'Could not locate specified user: 77777'
    );
  });

  test('should not get result for quering removed user', async () => {
    // Arrange
    const response = await createUserMutation(userName, app);
    userId = response.body.data.createUser.id;
    await removeUserMutation(userId, app);

    // Act
    const requestParamsQueryUser = {
      query: `{user(ID: "${userId}") {
          name
          id
        }}`,
    };
    const responseQueryResult = await graphqlRequest(
      requestParamsQueryUser,
      app
    );

    // Assert
    expect(responseQueryResult.status).toBe(200);
    expect(responseQueryResult.text).toContain(
      `Unable to locate user with given id: ${userId}`
    );
  });
});
