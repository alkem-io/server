import { graphqlRequest } from './helpers/helpers';
import { createUser } from './helpers/user';

let userName = '';

beforeEach(() => {
  userName = 'test' + Math.random().toString();
});

afterEach(() => {
  // delete the created user
});

describe('Create User', () => {
  // Query parameter values used in tests

  test('Should create a user', async () => {
    // Act
    const response = await createUser(userName);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data.createUser.name).toEqual(userName);
  });

  test('Should query created user', async () => {
    // Arrange
    const response = await createUser(userName);
    const userId = response.body.data.createUser.id;

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
});
