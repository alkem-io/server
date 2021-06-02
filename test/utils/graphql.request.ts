import { AuthenticationError } from 'apollo-server-express';
import request from 'supertest';
import { appSingleton } from './app.singleton';
import { TestUser } from './token.helper';

// ToDo
// Add support for connection to the DB and drop/populate DB
//    - GH Issue: https://app.zenhub.com/workspaces/cherrytwist-5ecb98b262ebd9f4aec4194c/issues/cherrytwist/coordination/163
// Add configurations file for environment against which, the tests are going to be run
// Add support for authentication

/**
 * GraphQL request wrapper for unauthenticated scenarios.
 * @param requestParams GraphQL request parameters
 * @api public
 */
export const graphqlRequest = async (requestParams: any) => {
  return await request(appSingleton.Instance.app.getHttpServer())
    .post('/graphql')
    .send({ ...requestParams })
    .set('Accept', 'application/json');
};

/**
 * GraphQL request wrapper for authenticated scenarios.
 * @param requestParams GraphQL request parameters
 * @param {TestUser} user impersonated user in the authentication scenario
 * @api public
 */
export const graphqlRequestAuth = async (
  requestParams: any,
  user?: TestUser
) => {
  let auth_token = '';

  if (!user) {
    return await graphqlRequest(requestParams);
  } else {
    const res = appSingleton.Instance.userTokenMap.get(user);
    //console.log(res);
    if (!res)
      throw new AuthenticationError(`Could not authenticate user ${user}`);
    else auth_token = res as string;
  }

  return await request(appSingleton.Instance.app.getHttpServer())
    .post('/graphql')
    .send({ ...requestParams })
    .set('Accept', 'application/json')
    .set('Authorization', `Bearer ${auth_token}`);
};

export const mutation = async (queryData: string, variablesData: string) => {
  const requestParams = {
    operationName: null,
    query: queryData,
    variables: variablesData,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const mutationNoAuth = async (
  queryData: string,
  variablesData: string
) => {
  const requestParams = {
    operationName: null,
    query: queryData,
    variables: variablesData,
  };

  return await graphqlRequest(requestParams);
};
