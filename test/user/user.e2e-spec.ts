import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  createUserMutation,
  getUsers,
  removeUserMutation,
} from './user.request.params';
import { AppModule } from '../../src/app.module';
import { graphqlRequest } from '../utils/graphql.request';
import '../utils/array.matcher';
import { TestDataService } from '../../src/utils/data-management/test-data.service';
import { DataManagementService } from '../../src/utils/data-management/data-management.service';

let userName = '';
let userId = '';
let testDataService: TestDataService;

beforeEach(() => {
  userName = 'test' + Math.random().toString();
});
let app: INestApplication;

beforeAll(async () => {
  const testModule: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = testModule.createNestApplication();
  await app.init();
  testDataService = testModule.get(TestDataService);

  await testDataService.initDB();
  await testDataService.initUsers();
});

afterAll(async () => {
  await testDataService.teardownUsers();
  await testDataService.teardownDB();
  await app.close();
});

describe('Create User', () => {
  afterEach(async () => {
    await removeUserMutation(userId, app);
  });

  test('should create a user', async () => {
    // Act
    const response = await createUserMutation(userName, app);
    userId = response.body.data.createUser.id;

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data.createUser.name).toEqual(userName);
  });

  test('should query created user', async () => {
    // Arrange
    const response = await createUserMutation(userName, app);
    userId = response.body.data.createUser.id;

    // Act
    const requestParamsQueryUser = {
      query: `{user(ID: "${userId}") {
          name
          id
        }}`,
    };
    const responseQuery = await graphqlRequest(requestParamsQueryUser, app);

    // Assert
    expect(responseQuery.status).toBe(200);
    expect(responseQuery.body.data.user.name).toEqual(userName);
  });

  test('should query created user details', async () => {
    // Arrange
    const requestParams = {
      operationName: 'CreateUser',
      query: `mutation CreateUser($userData: UserInput!) {
          createUser(userData: $userData) {
            id
            name
            firstName
            lastName
            email
            phone
            city
            country
            gender
            profile {
              references {
                name
              }
            }
            memberof {
              email
            }
          }
        }`,
      variables: {
        userData: {
          name: 'test77',
          firstName: 'testFN',
          lastName: 'testLN',
          email: 'testEmail',
          phone: '092834',
          city: 'testCity',
          country: 'testCountry',
          gender: 'testGender',
        },
      },
    };

    const responseQuery = await graphqlRequest(requestParams, app);
    userId = responseQuery.body.data.createUser.id;
    // Act
    const requestParamsQueryUser = {
      query: `{user(ID: "${userId}")
                  {
                    name
                    firstName
                    lastName
                    email
                    phone
                    city
                    country
                    gender
                    profile {
                      references {
                        name
                      }
                    }
                    memberof {
                      email
                    }
                  }
                }`,
    };
    const responseParamsQueryUser = await graphqlRequest(
      requestParamsQueryUser,
      app
    );

    // Assert
    expect(responseParamsQueryUser.status).toBe(200);
    expect(responseParamsQueryUser.body.data.user.name).toEqual('test77');
    expect(responseParamsQueryUser.body.data.user.firstName).toEqual('testFN');
    expect(responseParamsQueryUser.body.data.user.lastName).toEqual('testLN');
    expect(responseParamsQueryUser.body.data.user.email).toEqual('testEmail');
    expect(responseParamsQueryUser.body.data.user.phone).toEqual('092834');
    expect(responseParamsQueryUser.body.data.user.city).toEqual('testCity');
    expect(responseParamsQueryUser.body.data.user.country).toEqual(
      'testCountry'
    );
    expect(responseParamsQueryUser.body.data.user.gender).toEqual('testGender');
    expect(responseParamsQueryUser.body.data.user.profile).toEqual({
      references: [],
    });
    expect(responseParamsQueryUser.body.data.user.memberof).toEqual({
      email: 'testEmail',
    });
  });

  test('should throw error - create user with ID only', async () => {
    // Arrange
    const requestParams = {
      operationName: 'CreateUser',
      query:
        'mutation CreateUser($userData: UserInput!) {createUser(ID: id) { id name }}',
      variables: {
        userData: {
          id: 12,
        },
      },
    };

    // Act
    const responseQuery = await graphqlRequest(requestParams, app);

    // Assert
    expect(responseQuery.status).toBe(400);
  });

  test('should throw error - create user with LONG NAME', async () => {
    const requestParams = {
      operationName: 'CreateUser',
      query:
        'mutation CreateUser($userData: UserInput!) {createUser(userData: $userData) { id name }}',
      variables: {
        userData: {
          name:
            'very loooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooong name',
        },
      },
    };

    const responseQuery = await graphqlRequest(requestParams, app);

    // Assert
    expect(responseQuery.status).toBe(200);
    expect(responseQuery.text).toContain(
      "ER_DATA_TOO_LONG: Data too long for column 'name' at row 1"
    );
  });

  // Confirm the behaviour!!!!!
  test.skip('should created user without name', async () => {
    // Arrange
    const response = await createUserMutation('', app);
    userId = response.body.data.createUser.id;

    // Act
    const requestParamsQueryUser = {
      query: `{user(ID: "${userId}") {
          name
          id
        }}`,
    };
    const responseQuery = await graphqlRequest(requestParamsQueryUser, app);

    // Assert
    expect(responseQuery.status).toBe(400);
    expect(responseQuery.body.data.user.name).toEqual('');
  });
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
});

describe('Query all users', () => {
  it('should get users', async () => {
    const response = await getUsers(app);
    expect(response.status).toBe(200);
    expect(response.body.data.users).toContainObject({
      name: 'Bat Georgi',
    });
  });

  // test('should get memberships', async () => {
  //   const response = await getUserMemberships(app);

  //   expect(response.status).toBe(200);
  // });
});
