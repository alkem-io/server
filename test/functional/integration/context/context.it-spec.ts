import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';
import {
  createChallangeMutation,
  updateChallangeMutation,
} from '@test/functional/integration/challenge/challenge.request.params';
import { getContextQuery } from './context.request.params';
import { createReferenceOnContextMutation } from '../references/references.request.params';
import { response } from 'express';

let challengeName = '';
let challengeId = '';
let uniqueTextId = '';
const taglineText = 'taglineText';
const contextBackground = 'contextBackground';
const contextVision = 'contextVision';
const contextImpact = 'contextImpact';
const contextWho = 'contextWho';
const refName = 'refName';
const refUri = 'https://test.cherrytwist.org/';
const tagsArray = ['tag1', 'tag2'];
let challengeContextData = '';
let challengeRefName = '';
let challengeRefUri = '';
let contextIdChallenge = '';
let refId = '';
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

beforeEach(async () => {
  // Create Challenge
  const responseCreateChallenge = await createChallangeMutation(
    challengeName,
    uniqueTextId
  );
  challengeId = responseCreateChallenge.body.data.createChallenge.id;
  challengeContextData =
    responseCreateChallenge.body.data.createChallenge.context;
  challengeRefName =
    responseCreateChallenge.body.data.createChallenge.context.references[0]
      .name;
  challengeRefUri =
    responseCreateChallenge.body.data.createChallenge.context.references[0].uri;
  contextIdChallenge =
    responseCreateChallenge.body.data.createChallenge.context.id;
  refId =
    responseCreateChallenge.body.data.createChallenge.context.references[0].id;
});

describe('Context', () => {
  test.skip('should update and query challenge context and references', async () => {
    // Arrange
    // Query Challenge Context Data data
    const contextChallengeQuery = await getContextQuery(challengeId);

    // Act
    // Update challenge context and references
    const responseUpdateChallenge = await updateChallangeMutation(
      challengeId,
      challengeName + 'change',
      taglineText,
      contextBackground,
      contextVision,
      contextImpact,
      contextWho,
      tagsArray
    );
    const updatedChallengeData =
      responseUpdateChallenge.body.data.updateChallenge.context;

    // Query - updated context data
    const contextUpdatedChallengeQuery = await getContextQuery(challengeId);
    const queryAfterUpdate =
      contextUpdatedChallengeQuery.body.data.ecoverse.challenge.context;

    // Assert
    expect(contextChallengeQuery.body.data.ecoverse.challenge.context).toEqual(
      challengeContextData
    );
    expect(updatedChallengeData).toEqual(queryAfterUpdate);
    expect(queryAfterUpdate.references).toHaveLength(2);
  });

  test('should update the same reference and query challenge context and references', async () => {
    // Arrange
    // Query Challenge Context Data data
    const contextChallengeQuery = await getContextQuery(challengeId);

    // Act
    // Update challenge context and references
    const responseUpdateChallenge = await updateChallangeMutation(
      challengeId,
      challengeName + 'change',
      taglineText,
      contextBackground,
      contextVision,
      contextImpact,
      contextWho,
      tagsArray
    );

    const updatedChallengeData =
      responseUpdateChallenge.body.data.updateChallenge.context;

    // Query - updated context data
    const contextUpdatedChallengeQuery = await getContextQuery(challengeId);
    const queryAfterUpdate =
      contextUpdatedChallengeQuery.body.data.ecoverse.challenge.context;

    // Assert
    expect(contextChallengeQuery.body.data.ecoverse.challenge.context).toEqual(
      challengeContextData
    );
    expect(updatedChallengeData).toEqual(queryAfterUpdate);
    expect(queryAfterUpdate.references).toHaveLength(1);
  });

  test.skip('should not create reference using same name on context', async () => {
    // Act
    // Update challenge context and references
    const responseCreateContextReference = await createReferenceOnContextMutation(
      contextIdChallenge,
      challengeRefName,
      refUri
    );

    // Query - updated context data
    const contextUpdatedChallengeQuery = await getContextQuery(challengeId);
    const queryAfterUpdate =
      contextUpdatedChallengeQuery.body.data.ecoverse.challenge.context;

    // Assert
    expect(
      responseCreateContextReference.body.data.createReferenceOnContext.name
    ).toEqual(challengeRefName);
    expect(
      responseCreateContextReference.body.data.createReferenceOnContext.uri
    ).toEqual(challengeRefUri);
    expect(queryAfterUpdate.references[0].name).toEqual(challengeRefName);
    expect(queryAfterUpdate.references[0].uri).toEqual(challengeRefUri);

    expect(queryAfterUpdate.references).toHaveLength(1);
  });

  test.skip('should create reference using different name on context', async () => {
    // Act
    // Update challenge context and references
    await createReferenceOnContextMutation(contextIdChallenge, refName, refUri);

    // Query - updated context data
    const contextUpdatedChallengeQuery = await getContextQuery(challengeId);
    const queryAfterUpdate =
      contextUpdatedChallengeQuery.body.data.ecoverse.challenge.context;

    // Assert
    expect(queryAfterUpdate.references[0].name).toEqual(challengeRefName);
    expect(queryAfterUpdate.references[0].uri).toEqual(challengeRefUri);
    expect(queryAfterUpdate.references[1].name).toEqual(refName);
    expect(queryAfterUpdate.references[1].uri).toEqual(refUri);

    expect(queryAfterUpdate.references).toHaveLength(2);
  });
});
