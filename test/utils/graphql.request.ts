import request from 'supertest';
import { appSingleton } from './app.singleton';

// ToDo
// Add support for connection to the DB and drop/populate DB
//    - GH Issue: https://app.zenhub.com/workspaces/cherrytwist-5ecb98b262ebd9f4aec4194c/issues/cherrytwist/coordination/163
// Add configurations file for environment against which, the tests are going to be run
// Add support for authentication

export const graphqlRequest = async (
  requestParams: any
  // app: INestApplication
) => {
  return request(appSingleton.Instance.app.getHttpServer())
    .post('/graphql')
    .send({ ...requestParams })
    .set('Accept', 'application/json')
    .set('Authorization', `Bearer ${appSingleton.Instance.accessToken}`);
};

export const graphqlRequestAuth = async (
  requestParams: any
  // app: INestApplication
) => {
  return request("https://dev.cherrytwist.org")
    .post('/graphql')
    .send({ ...requestParams })
    .set('Accept', 'application/json');
};