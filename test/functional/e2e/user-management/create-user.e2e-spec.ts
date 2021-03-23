import { createUserMutation, removeUserMutation } from './user.request.params';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';
import { TestUser } from '../../../utils/token.helper';

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
  userName = `testUser${uniqueId}`;
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
    expect(response.body.data.createUser.name).toEqual(userName);
  });

  test('should throw error - same user is created twice', async () => {
    // Arrange
    const response = await createUserMutation(userName);
    userId = response.body.data.createUser.id;
    const userEmailGenerated = response.body.data.createUser.email;

    // Act
    const responseSecondTime = await createUserMutation(userName);

    // Assert
    expect(responseSecondTime.status).toBe(200);
    expect(responseSecondTime.text).toContain(
      `User profile with the specified email (${userEmailGenerated}) already exists`
    );
  });

  test('should query created user', async () => {
    // Arrange
    const response = await createUserMutation(userName);
    userId = response.body.data.createUser.id;

    // Act
    const requestParamsQueryUser = {
      query: `{user(ID: "${userId}") {
          name
          id
        }}`,
    };
    const responseQuery = await graphqlRequestAuth(
      requestParamsQueryUser,
      TestUser.GLOBAL_ADMIN
    );

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
              groups {
                name
              }
            }
          }
        }`,
      variables: {
        userData: {
          name: userName,
          firstName: userFirstName,
          lastName: userLastName,
          email: userEmail,
          phone: userPhone,
          city: 'testCity',
          country: 'testCountry',
          gender: 'testGender',
          aadPassword: `90!ds${uniqueId}`,
        },
      },
    };

    const responseQuery = await graphqlRequestAuth(
      requestParams,
      TestUser.GLOBAL_ADMIN
    );
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
                      groups {
                        name
                      }
                    }
                  }
                }`,
    };
    const responseParamsQueryUser = await graphqlRequestAuth(
      requestParamsQueryUser,
      TestUser.GLOBAL_ADMIN
    );

    // Assert
    expect(responseParamsQueryUser.status).toBe(200);
    expect(responseParamsQueryUser.body.data.user.name).toEqual(userName);
    expect(responseParamsQueryUser.body.data.user.firstName).toEqual(
      userFirstName
    );
    expect(responseParamsQueryUser.body.data.user.lastName).toEqual(
      userLastName
    );
    expect(responseParamsQueryUser.body.data.user.email).toEqual(userEmail);
    expect(responseParamsQueryUser.body.data.user.phone).toEqual(userPhone);
    expect(responseParamsQueryUser.body.data.user.city).toEqual('testCity');
    expect(responseParamsQueryUser.body.data.user.country).toEqual(
      'testCountry'
    );
    expect(responseParamsQueryUser.body.data.user.gender).toEqual('testGender');
    expect(responseParamsQueryUser.body.data.user.profile).toEqual({
      references: [],
    });
  });

  test('should throw error - create user with ID instead of name', async () => {
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
    const responseQuery = await graphqlRequestAuth(
      requestParams,
      TestUser.GLOBAL_ADMIN
    );

    // Assert
    expect(responseQuery.status).toBe(400);
  });

  test('should throw error - create user with LONG NAME', async () => {
    // Arrange
    const requestParams = {
      operationName: 'CreateUser',
      query:
        'mutation CreateUser($userData: UserInput!) {createUser(userData: $userData) { id name }}',
      variables: {
        userData: {
          name:
            'very loooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooong name',
          email: userEmail,
          firstName: 'testF',
          lastName: 'testL',
        },
      },
    };

    // Act
    const responseQuery = await graphqlRequestAuth(
      requestParams,
      TestUser.GLOBAL_ADMIN
    );

    // Assert
    expect(responseQuery.status).toBe(200);
    expect(responseQuery.text).toContain(
      'property name has failed the following constraints: maxLength'
    );
  });

  test('should throw error - create user with invalid email', async () => {
    // Arrange
    const requestParams = {
      operationName: 'CreateUser',
      query:
        'mutation CreateUser($userData: UserInput!) {createUser(userData: $userData) { id name }}',
      variables: {
        userData: {
          name: 'name',
          firstName: 'name',
          lastName: 'name',
          email: 'testEmail',
          aadPassword: `90!ds${uniqueId}`,
        },
      },
    };

    // Act
    const responseQuery = await graphqlRequestAuth(
      requestParams,
      TestUser.GLOBAL_ADMIN
    );

    // Assert
    expect(responseQuery.status).toBe(200);
    expect(responseQuery.text).toContain(
      'property email has failed the following constraints: isEmail'
    );
  });
});
