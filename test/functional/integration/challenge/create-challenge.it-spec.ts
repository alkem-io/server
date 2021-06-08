import {
  createChallangeMutation,
  getChallengeData,
  getChallengesData,
  removeChallangeMutation,
} from './challenge.request.params';
import '../../../utils/array.matcher';
import { appSingleton } from '../../../utils/app.singleton';
import { TestDataServiceInitResult } from '@src/services/domain/data-management/test-data.service';

let data: TestDataServiceInitResult;

let challengeName = '';
let uniqueTextId = '';
let challengeId = '';
let challengeDataCreate = '';
let ecoverseId = '';

const challangeData = async (challengeId: string): Promise<string> => {
  const responseQuery = await getChallengeData(challengeId);
  console.log(responseQuery.body);
  const response = responseQuery.body.data.ecoverse.challenge;
  return response;
};

const challengesList = async (): Promise<string> => {
  const responseQuery = await getChallengesData();
  //console.log(responseQuery.body);
  const response = responseQuery.body.data.ecoverse.challenges;
  return response;
};
beforeEach(async () => {
  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  challengeName = `testChallenge ${uniqueTextId}`;
  const response = await createChallangeMutation(challengeName, uniqueTextId);
  //console.log(response.body)
  challengeDataCreate = response.body.data.createChallenge;
  challengeId = response.body.data.createChallenge.id;
});

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
  data = appSingleton.Instance.getData();
  ecoverseId = data.ecoverseId;
});

// afterAll(async () => {
//   if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
// });

// afterEach(async () => {
//   await removeChallangeMutation(challengeId);
// });

describe('Create Challenge', () => {
  test('should create a successfull challenge', async () => {
    // Act
    const response = await createChallangeMutation(
      'challengeName',
      'chal-texti'
    );
    // console.log(response.body)
    const challengeDataCreate = response.body.data.createChallenge;
    const challengeIdTest = response.body.data.createChallenge.id;

    // Assert
    expect(response.status).toBe(200);
    expect(challengeDataCreate.displayName).toEqual('challengeName');
    expect(challengeDataCreate).toEqual(await challangeData(challengeIdTest));
  });

  test('should remove a challenge', async () => {
    // Arrange
    const challangeDataBeforeRemove = await challangeData(challengeId);

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
      //  ecoverseId,
      `${challengeName}change`,
      `${uniqueTextId}c`
    );
    const responseChallengeTwoId =
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
      // ecoverseId,
      `${challengeName}change`,
      `${uniqueTextId}c`
    );
    const responseSimpleChallengeId =
      responseSimpleChallenge.body.data.createChallenge.id;

    // Assert
    expect(await challengesList()).toContainObject(
      await challangeData(responseSimpleChallengeId)
    );
  });

  test('should create a group, when create a challenge', async () => {
    // // Arrange
    const responseChallenge = await createChallangeMutation(
      // ecoverseId,
      challengeName + 'd',
      uniqueTextId + 'd'
    );

    // Act
    const challengeId = responseChallenge.body.data.createChallenge.id;

    // Assert
    expect(responseChallenge.status).toBe(200);
    expect(
      responseChallenge.body.data.createChallenge.community.displayName
    ).toEqual(challengeName + 'd');
    expect(
      responseChallenge.body.data.createChallenge.community.id
    ).not.toBeNull();
  });

  // to be discussed
  describe('DDT invalid textId', () => {
    // Arrange
    test.each`
      nameId       | expected
      ${'d'}       | ${'Expected type \\"NameID\\". NameID value not valid: d'}
      ${'vvv,vvd'} | ${'Expected type \\"NameID\\". NameID value not valid: vvv,vvd'}
      ${'..-- d'}  | ${'Expected type \\"NameID\\". NameID value not valid: ..-- d'}
    `(
      'should throw error: "$expected" for nameId value: "$nameId"',
      async ({ nameId, expected }) => {
        const response = await createChallangeMutation(
          challengeName + 'd',
          nameId + 'd'
        );

        // Assert
        expect(response.text).toContain(expected);
      }
    );
  });
});
