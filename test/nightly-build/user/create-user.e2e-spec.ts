import { createUserMutation, removeUserMutation } from './user.request.params';
import { graphqlRequest } from '../../utils/graphql.request';
import '../../utils/array.matcher';
import { appSingleton } from '../../utils/app.singleton';

let userFirstName = '';
let userLastName = '';
let userName = '';
let userId = '';
let userPhone = '';
let userEmail = '';

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
});

afterAll(async () => {
  if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
});

const uniqueId = Math.random().toString();

beforeEach(() => {
  userName = `testUser ${uniqueId}`;
  userFirstName = `testUserFirstName ${uniqueId}`;
  userLastName = `testUserLastName ${uniqueId}`;
  userPhone = `userPhone ${uniqueId}`;
  userEmail = `${uniqueId}@test.com`;
});

describe.skip('Create User', () => {
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
    const responseQuery = await graphqlRequest(requestParamsQueryUser);

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
        },
      },
    };

    const responseQuery = await graphqlRequest(requestParams);
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
    const responseParamsQueryUser = await graphqlRequest(
      requestParamsQueryUser
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
    const responseQuery = await graphqlRequest(requestParams);

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
    const responseQuery = await graphqlRequest(requestParams);

    // Assert
    expect(responseQuery.status).toBe(200);
    expect(responseQuery.text).toContain(
      'ER_DATA_TOO_LONG: Data too long for column \'name\' at row 1'
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
        },
      },
    };

    // Act
    const responseQuery = await graphqlRequest(requestParams);

    // Assert
    expect(responseQuery.status).toBe(200);
    expect(responseQuery.text).toContain(
      'Valid email address required to create a user: testEmail'
    );
  });
});
