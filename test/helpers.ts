import request from 'supertest';

// ToDo
// Add support for connection to the DB and drop/populate DB
//    - GH Issue: https://app.zenhub.com/workspaces/cherrytwist-5ecb98b262ebd9f4aec4194c/issues/cherrytwist/coordination/163
// Add configurations file for environment against which, the tests are going to be run
// Add support for authentication

const baseUrl = 'http://localhost:4000/graphql';

export const graphqlRequest = (requestParams: any) => {
  return request(baseUrl)
    .post('/')
    .send({ ...requestParams })
    .set('Accept', 'application/json');
};
