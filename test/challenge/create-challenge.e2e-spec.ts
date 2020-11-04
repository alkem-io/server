import {
  createChallangeMutation,
  getChallenge,
} from './challenge.request.params';
import { graphqlRequest } from '../utils/graphql.request';
import '../utils/array.matcher';
import { appSingleton } from '../utils/app.singleton';

let challengeName = '';
let challengeId = '';
let uniqueTextId = '';
let uniqueId = Math.random().toString();
beforeEach(async () => {
  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  challengeName = `testChallenge ${uniqueTextId}`;
});

//let challengeNames ='';

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
});

afterAll(async () => {
  if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
});

describe('Create Challenge', () => {
  test('should create a successfull challenge', async () => {
    // Act
    const response = await createChallangeMutation(challengeName, uniqueTextId);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data.createChallenge.name).toEqual(challengeName);
  });

  test('should create 2 challenges with different names', async () => {
    // Act
    const responseChallengeOne = await createChallangeMutation(
      challengeName,
      uniqueTextId
    );

    const responseChallengeTwo = await createChallangeMutation(
      `${challengeName}change`,
      uniqueTextId
    );

    // Assert
    expect(responseChallengeOne.status).toBe(200);
    expect(responseChallengeOne.body.data.createChallenge.name).toEqual(
      challengeName
    );

    expect(responseChallengeTwo.status).toBe(200);
    expect(responseChallengeTwo.body.data.createChallenge.name).toEqual(
      `${challengeName}change`
    );
  });

  //to be implemeneted?
  test.skip('should thow error - creating 2 challenges with same name', async () => {
    // Act
    await createChallangeMutation(challengeName, uniqueTextId);
    const response = await createChallangeMutation('1', uniqueTextId);
    challengeId = response.body.data.createChallenge.id;
    console.log(response.body);
    console.log(challengeName);
    console.log(response.text);

    // Assert
    expect(response.status).toBe(200);
    // expect(response.body.data.createChallenge.name).toEqual(
    //   `Challenge with name: ${challengeName} is already created`
    // );
  });

  test('should create challenge without reference and context', async () => {
    // Act
    const requestParamsCreateChallenge = {
      operationName: null,
      query: `mutation CreateChallenge($challengeData: ChallengeInput!) {
      createChallenge(challengeData: $challengeData) { name id } }`,
      variables: {
        challengeData: {
          name: challengeName,
          textID: uniqueTextId,
        },
      },
    };
    const response = await graphqlRequest(requestParamsCreateChallenge);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data.createChallenge.name).toEqual(challengeName);
  });

  test('should create challenge with defined state', async () => {
    // Act
    const requestParamsCreateChallenge = {
      operationName: null,
      query: `mutation CreateChallenge($challengeData: ChallengeInput!) {
      createChallenge(challengeData: $challengeData) { name id state} }`,
      variables: {
        challengeData: {
          name: challengeName,
          textID: uniqueTextId,
          state: 'state value',
        },
      },
    };
    const response = await graphqlRequest(requestParamsCreateChallenge);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data.createChallenge.state).toEqual('state value');
  });

  test('should create a group, when create a challenge', async () => {
    // // Arrange
    const responseChallenge = await createChallangeMutation(
      challengeName,
      uniqueTextId
    );

    // Act
    const challengeId = responseChallenge.body.data.createChallenge.id;

    // Assert
    expect(responseChallenge.status).toBe(200);
    expect(responseChallenge.body.data.createChallenge.groups[0].name).toEqual(
      'members'
    );
    expect(
      responseChallenge.body.data.createChallenge.groups[0].id
    ).not.toBeNull();
  });

  describe('DDT invalid textId', () => {
    // Arrange
    test.each`
      textId                | expected
      ${''}                 | ${'Required field textID not specified'}
      ${'vvv,vv'}           | ${'Required field textID provided not in the correct format: vvv,vv'}
      ${'..-- '}            | ${'Required field textID provided not in the correct format: ..-- '}
      ${'toooo-long-texId'} | ${"ER_DATA_TOO_LONG: Data too long for column 'textID' at row 1"}
    `(
      `should throw error: '$expected' for textId value: '$textId'`,
      async ({ textId, expected }) => {
        // Act
        const requestParamsCreateChallenge = {
          operationName: null,
          query: `mutation CreateChallenge($challengeData: ChallengeInput!) {
            createChallenge(challengeData: $challengeData) { name id } }`,
          variables: {
            challengeData: {
              name: challengeName,
              textID: textId,
            },
          },
        };
        const responseInvalidTextId = await graphqlRequest(
          requestParamsCreateChallenge
        );

        // Assert
        expect(responseInvalidTextId.status).toBe(200);
        expect(responseInvalidTextId.text).toContain(expected);
      }
    );
  });
});
