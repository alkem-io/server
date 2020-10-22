import { graphqlRequest } from './helpers/helpers';
import { createUserMutation, removeUserMutation } from './helpers/user';

let userName = '';
let userId = '';

beforeEach(() => {
  userName = 'test' + Math.random().toString();
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
                    email
                  }
                }
              }`,
    };
    const responseParamsQueryUser = await graphqlRequest(
      requestParamsQueryUser
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
    const responseQuery = await graphqlRequest(requestParams);

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

    const responseQuery = await graphqlRequest(requestParams);

    // Assert
    expect(responseQuery.status).toBe(200);
    expect(responseQuery.text).toContain(
      "ER_DATA_TOO_LONG: Data too long for column 'name' at row 1"
    );
  });

  // Confirm the behaviour!!!!!
  test.skip('should created user without name', async () => {
    // Arrange
    const response = await createUserMutation('');
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
    //expect(responseQuery.status).toBe(400);
    //expect(responseQuery.body.data.user.name).toEqual("");
  });
});

describe('Remove user', () => {
  test('should remove created user', async () => {
    // Arrange
    const response = await createUserMutation(userName);
    userId = response.body.data.createUser.id;

    // Act
    const responseQuery = await removeUserMutation(userId);

    // Assert
    expect(responseQuery.status).toBe(200);
    expect(responseQuery.body.data.removeUser).toBe(true);
  });

  test('should receive a message for removing already removed user', async () => {
    // Arrange
    const response = await createUserMutation(userName);
    userId = response.body.data.createUser.id;
    await removeUserMutation(userId);

    // Act
    const responseQuery = await removeUserMutation(userId);

    // Assert
    expect(responseQuery.status).toBe(200);
    expect(responseQuery.text).toContain(
      `Could not locate specified user: ${userId}`
    );
  });

  test('should receive a message for removing unexisting user', async () => {
    // Act
    const responseQuery = await removeUserMutation(77777);

    // Assert
    expect(responseQuery.status).toBe(200);
    expect(responseQuery.text).toContain(
      'Could not locate specified user: 77777'
    );
  });
});

describe('Query all users', () => {});
