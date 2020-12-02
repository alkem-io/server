import { graphqlRequestAuth } from '../utils/graphql.request';
import '../utils/array.matcher';
import { appSingleton } from '../utils/app.singleton';
import { name, hostMembers, hostGroups, hostProfile } from '../utils/queries';

let profileId = '6';

const notAuthorizedMessage = `"message":"You are not authorized to access this resource. "`;

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
});

afterAll(async () => {
  if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
});

describe('DDT anonymous user - queries', () => {
  // Arrange
  test.each`
    query          | expected
    ${name}        | ${`{"data":{"name":"Cherrytwist"}}`}
    ${hostGroups}  | ${notAuthorizedMessage}
    ${hostMembers} | ${notAuthorizedMessage}
    ${hostProfile} | ${`{"data":{"host":{"profile":{"id":"${profileId}"}}}}`}
  `(
    "should expect: '$expected' for query: '$query'",
    async ({ query, expected }) => {
      // Act
      const requestParamsCreateChallenge = {
        operationName: null,
        query: `${query}`,
        variables: null,
      };
      const response = await graphqlRequestAuth(requestParamsCreateChallenge);
      let responseData = JSON.stringify(response.body).replace('\\', '');
      // console.log(responseData);

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toContain(expected);
    }
  );
});
