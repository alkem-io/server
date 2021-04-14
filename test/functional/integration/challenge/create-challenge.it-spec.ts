import {
  createChallangeMutation,
  getChallengeData,
  getChallengesData,
  removeChallangeMutation,
} from './challenge.request.params';
import { graphqlRequestAuth } from '../../../utils/graphql.request';
import '../../../utils/array.matcher';
import { appSingleton } from '../../../utils/app.singleton';
import { TestUser } from '../../../utils/token.helper';

let challengeName = '';
let uniqueTextId = '';
let challengeId = '';
let challengeDataCreate = '';

let challangeData = async (challengeId: string): Promise<String> => {
  const responseQuery = await getChallengeData(challengeId);
  let response = responseQuery.body.data.ecoverse.challenge;
  return response;
};

let challengesList = async (): Promise<String> => {
  const responseQuery = await getChallengesData();
  let response = responseQuery.body.data.ecoverse.challenges;
  return response;
};
beforeEach(async () => {
  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  challengeName = `testChallenge ${uniqueTextId}`;
  const response = await createChallangeMutation(challengeName, uniqueTextId);
  challengeDataCreate = response.body.data.createChallenge;
  challengeId = response.body.data.createChallenge.id;
});

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
});

afterAll(async () => {
  if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
});

afterEach(async () => {
  await removeChallangeMutation(challengeId);
});

describe('Create Challenge', () => {
  test('should create a successfull challenge', async () => {
    // Act
    const response = await createChallangeMutation(
      'challengeName',
      'chal-texti'
    );
    let challengeDataCreate = response.body.data.createChallenge;
    let challengeIdTest = response.body.data.createChallenge.id;

    // Assert
    expect(response.status).toBe(200);
    expect(challengeDataCreate.name).toEqual('challengeName');
    expect(challengeDataCreate).toEqual(await challangeData(challengeIdTest));
  });

  test('should remove a challenge', async () => {
    // Arrange
    let challangeDataBeforeRemove = await challangeData(challengeId);

    // Act
    const removeChallengeResponse = await removeChallangeMutation(challengeId);

    // Assert
    expect(removeChallengeResponse.status).toBe(200);
    expect(removeChallengeResponse.body.data.deleteChallenge.id).toEqual(
      challengeId
    );
    expect(await challengesList()).not.toContainObject(
      challangeDataBeforeRemove
    );
  });

  test('should create 2 challenges with different names and textIDs', async () => {
    // Act
    const responseChallengeTwo = await createChallangeMutation(
      `${challengeName}change`,
      `${uniqueTextId}c`
    );
    let responseChallengeTwoId =
      responseChallengeTwo.body.data.createChallenge.id;

    // Assert
    expect(await challengesList()).toContainObject(
      await challangeData(challengeId)
    );
    expect(await challengesList()).toContainObject(
      await challangeData(responseChallengeTwoId)
    );
  });

  test('should create challenge with name and textId only', async () => {
    // Act
    const responseSimpleChallenge = await createChallangeMutation(
      `${challengeName}change`,
      `${uniqueTextId}c`
    );
    let responseSimpleChallengeId =
      responseSimpleChallenge.body.data.createChallenge.id;

    // Assert
    expect(await challengesList()).toContainObject(
      await challangeData(responseSimpleChallengeId)
    );
  });

  test('should create a group, when create a challenge', async () => {
    // // Arrange
    const responseChallenge = await createChallangeMutation(
      challengeName + 'd',
      uniqueTextId + 'd'
    );

    // Act
    const challengeId = responseChallenge.body.data.createChallenge.id;

    // Assert
    expect(responseChallenge.status).toBe(200);
    expect(
      responseChallenge.body.data.createChallenge.community.groups[0].name
    ).toEqual('members');
    expect(
      responseChallenge.body.data.createChallenge.community.groups[0].id
    ).not.toBeNull();
  });

  // to be discussed
  describe.skip('DDT invalid textId', () => {
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
          query: `mutation CreateChallenge($challengeData: CreateChallengeInput!) {
            createChallenge(challengeData: $challengeData) { name id } }`,
          variables: {
            challengeData: {
              parentID: 1,
              name: challengeName + 'd',
              textID: textId + 'd',
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
