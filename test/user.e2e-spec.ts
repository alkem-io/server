import { graphqlRequest } from './helpers';

// Query parameter values used in tests
let userName = 'test' + Math.random().toString();

test('Should create a user', async () => {
  // Ararnge
  const requestParams = {
    operationName: 'CreateUser',
    query:
      'mutation CreateUser($userData: UserInput!) {createUser(userData: $userData) { name }}',
    variables: {
      userData: {
        name: userName,
      },
    },
  };

  // Act
  const response = await graphqlRequest(requestParams);

  // Assert
  expect(response.status).toBe(200);
  expect(response.body.data.createUser.name).toEqual(userName);
});

test('Should query created user', async () => {
  // Ararnge
  const requestParamsMutation = {
    operationName: 'CreateUser',
    query:
      'mutation CreateUser($userData: UserInput!) {createUser(userData: $userData) { name }}',
    variables: {
      userData: {
        name: userName,
      },
    },
  };

  // Act

  // Get the "Id" of the last created user from all users
  const requestParamsQueryUsers = {
    query: '{ users { id, name} }',
  };
  const responseQueryUsers = await graphqlRequest(requestParamsQueryUsers);
  const lastCreatedUserId = responseQueryUsers.body.data.users.slice(-1)[0].id;

  // Find the user by "Id"
  const requestParamsQueryUser = {
    query: '{user(ID: "' + lastCreatedUserId + '") { name, id }}',
  };
  const responseQuery = await graphqlRequest(requestParamsQueryUser);

  // Assert
  expect(responseQuery.status).toBe(200);
  expect(responseQuery.body.data.user.name).toEqual(userName);
});
