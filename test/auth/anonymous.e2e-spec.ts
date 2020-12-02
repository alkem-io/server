import { graphqlRequest, graphqlRequestAuth } from '../utils/graphql.request';
import '../utils/array.matcher';
import { appSingleton } from '../utils/app.singleton';
import { name, hostMembers, hostGroups, hostProfile } from '../utils/queries';

let userFirstName = '';
let userLastName = '';
let userName = '';
let userId = '';
let userPhone = '';
let userEmail = '';
let profileId = '6';

const notAuthorizedMessage = `"message":"You are not authorized to access this resource. "`;

export const queryName = async () => {
  const requestParams = {
    operationName: null,
    query: `{
        name
    }`,
  };

  return await graphqlRequestAuth(requestParams);
};

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
});

afterAll(async () => {
  if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
});

const uniqueId = Math.random().toString();

beforeEach(() => {
  userName = `testUser ${uniqueId}`;
  userFirstName = `testUserFirstName ${uniqueId}`;
  userLastName = `testUserLastName ${uniqueId}`;
  userPhone = `userPhone ${uniqueId}`;
  userEmail = `${uniqueId}@test.com`;
});

describe('Create User', () => {
  afterEach(async () => {
    //await removeUserMutation(userId);
  });

  test('should create a user', async () => {
    // Act
    const response = await queryName();

    console.log(response.body);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data).not.toHaveLength(0);
  });
});

describe.only('DDT anonymous user - queries', () => {
  // Arrange
  test.each`
    query          | expected
    ${name}        | ${`{"data":{"name":"Cherrytwist"}}`}
    ${hostGroups}  | ${notAuthorizedMessage}
    ${hostMembers} | ${notAuthorizedMessage}
    ${hostProfile} | ${`{"data":{"host":{"profile":{"id":${profileId}`}
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

// ${'vvv,vv'}           | ${'Required field textID provided not in the correct format: vvv,vv'}
// ${'..-- '}            | ${'Required field textID provided not in the correct format: ..-- '}
// ${'toooo-long-texId'} | ${"ER_DATA_TOO_LONG: Data too long for column 'textID' at row 1"}
