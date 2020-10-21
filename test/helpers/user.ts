import { graphqlRequest } from './helpers';

export const createUser = async (userName: string) => {
  const requestParams = {
    operationName: 'CreateUser',
    query:
      'mutation CreateUser($userData: UserInput!) {createUser(userData: $userData) { id name }}',
    variables: {
      userData: {
        name: userName,
      },
    },
  };

  return await graphqlRequest(requestParams);
};
