import { graphqlRequest } from './helpers';

export const createUserMutation = async (userName: string) => {
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

export const createUserDetailsMutation = async (
  userName: string,
  phone: string,
  email: string
) => {
  const requestParams = {
    operationName: 'CreateUser',
    query: `mutation CreateUser($userData: UserInput!) {
        createUser(userData: $userData) {
           id 
           name 
           phone
           email            
          }
        }`,
    variables: {
      userData: {
        name: userName,
        firstName: 'testFN',
        lastName: 'testLN',
        email: email,
        phone: phone,
        city: 'testCity',
        country: 'testCountry',
        gender: 'testGender',
      },
    },
  };

  return await graphqlRequest(requestParams);
};

export const updateUserMutation = async (
  updateUserId: any,
  name: string,
  phone: string
) => {
  const requestParams = {
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
      userID: parseFloat(updateUserId),
      userData: {
        name: name,
        phone: phone,
      },
    },
  };

  return await graphqlRequest(requestParams);
};

export const removeUserMutation = async (removeUserID: any) => {
  const requestParams = {
    operationName: 'removeUser',
    query: 'mutation removeUser($userID: Float!) {removeUser(userID: $userID)}',
    variables: {
      userID: parseFloat(removeUserID),
    },
  };

  return await graphqlRequest(requestParams);
};
