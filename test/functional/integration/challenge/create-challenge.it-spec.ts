import {
  createChallangeMutation,
  removeChallangeMutation,
} from './challenge.request.params';
import { graphqlRequestAuth } from '../../../utils/graphql.request';
import '../../../utils/array.matcher';
import { appSingleton } from '../../../utils/app.singleton';
import { TestUser } from '../../../utils/token.helper';

let challengeName = '';
let uniqueTextId = '';
beforeEach(async () => {
  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  challengeName = `testChallenge ${uniqueTextId}`;
});

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

  test('should remove a challenge', async () => {
    // Arrange
    const response = await createChallangeMutation(challengeName, uniqueTextId);
    const challengeId = response.body.data.createChallenge.id;

    // Act
    const removeChallengeResponse = await removeChallangeMutation(challengeId);

    // Assert
    expect(removeChallengeResponse.status).toBe(200);
    expect(removeChallengeResponse.body.data.removeChallenge).toBe(true);
  });

  test('should create 2 challenges with different names and textIDs', async () => {
    // Act
    const responseChallengeOne = await createChallangeMutation(
      challengeName,
      uniqueTextId
    );

    const responseChallengeTwo = await createChallangeMutation(
      `${challengeName}change`,
      `${uniqueTextId}c`
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
    const response = await graphqlRequestAuth(
      requestParamsCreateChallenge,
      TestUser.GLOBAL_ADMIN
    );

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
    const response = await graphqlRequestAuth(
      requestParamsCreateChallenge,
      TestUser.GLOBAL_ADMIN
    );

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
      textId      | expected
      ${''}       | ${'Required field textID not specified'}
      ${'vvv,vv'} | ${'Required field textID provided not in the correct format: vvv,vv'}
      ${'..-- '}  | ${'Required field textID provided not in the correct format: ..-- '}
    `(
      'should throw error: "$expected" for textId value: "$textId"',
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
        const responseInvalidTextId = await graphqlRequestAuth(
          requestParamsCreateChallenge,
          TestUser.GLOBAL_ADMIN
        );

        // Assert
        expect(responseInvalidTextId.status).toBe(200);
        expect(responseInvalidTextId.text).toContain(expected);
      }
    );
  });
});
