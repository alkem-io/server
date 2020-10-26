import { INestApplication } from '@nestjs/common';
import { graphqlRequest } from '../utils/graphql.request';

export const createUserMutation = async (
  userName: string,
  app: INestApplication
) => {
  const requestParams = {
    operationName: 'CreateUser',
    query:
      'mutation CreateUser($userData: UserInput!) {createUser(userData: $userData) { id name }}',
    variables: {
      userData: {
        name: userName,
        email: `${userName}@test.com`,
      },
    },
  };

  return await graphqlRequest(requestParams, app);
};
// let id
// let removeUserID = parseFloat(id)
export const removeUserMutation = async (
  removeUserID: any,
  app: INestApplication
) => {
  const requestParams = {
    operationName: 'removeUser',
    query: 'mutation removeUser($userID: Float!) {removeUser(userID: $userID)}',
    variables: {
      userID: parseFloat(removeUserID),
    },
  };

  return await graphqlRequest(requestParams, app);
};

export const getUserMemberships = async (app: INestApplication) => {
  const requestParams = {
    operationName: 'users',
    query:
      'query users {name memberof{ email, groups{name}, challenges{name}, organisations{name}}}',
  };

  return await graphqlRequest(requestParams, app);
};

export const getUsers = async (app: INestApplication) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: 'query{users {name}}',
  };

  return await graphqlRequest(requestParams, app);
};
