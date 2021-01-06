import '../utils/array.matcher';
import { appSingleton } from '../utils/app.singleton';
import { createChallangeMutation } from '../challenge/challenge.request.params';
import {
  createRelationMutation,
  getRelationsPerOpportunity,
  removeRelationMutation,
  updateRelationMutation,
} from './relations.request.params';
import { createOpportunityOnChallengeMutation } from '../opportunity/opportunity.request.params';

const relationIncoming = 'incoming';
const relationOutgoing = 'outgoing';
let opportunityName = '';
let opportunityTextId = '';
let opportunityId = '';
let challengeName = '';
let challengeId = '';
let relationId = '';
let relationDescription = '';
let relationActorName = '';
let relationActorType = '';
let relationActorRole = '';
let uniqueTextId = '';
beforeEach(async () => {
  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  challengeName = `testChallenge ${uniqueTextId}`;
  opportunityName = `opportunityName ${uniqueTextId}`;
  opportunityTextId = `${uniqueTextId}`;
  relationDescription = `relationDescription-${uniqueTextId}`;
  relationActorName = `relationActorName-${uniqueTextId}`;
  relationActorType = `relationActorType-${uniqueTextId}`;
  relationActorRole = `relationActorRole-${uniqueTextId}`;
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
  // Create Opportunity
  const responseCreateOpportunityOnChallenge = await createOpportunityOnChallengeMutation(
    challengeId,
    opportunityName,
    opportunityTextId
  );

  opportunityId =
    responseCreateOpportunityOnChallenge.body.data.createOpportunityOnChallenge
      .id;
});

describe('Relations', () => {
  test('should create relation', async () => {
    // Act
    // Create Relation
    const createRelationResponse = await createRelationMutation(
      opportunityId,
      relationIncoming,
      relationDescription,
      relationActorName,
      relationActorType,
      relationActorRole
    );
    const response = createRelationResponse.body.data.createRelation;

    // Assert
    expect(createRelationResponse.status).toBe(200);
    expect(response.type).toEqual(relationIncoming);
    expect(response.description).toEqual(relationDescription);
    expect(response.actorName).toEqual(relationActorName);
    expect(response.actorRole).toEqual(relationActorRole);
    expect(response.actorType).toEqual(relationActorType);
  });

  // Review code implementation in relation.service.ts file for update Relation mutation
  test.skip('should update relation', async () => {
    // Arrange
    // Create relation
    const createRelationResponse = await createRelationMutation(
      opportunityId,
      relationIncoming,
      relationDescription,
      relationActorName,
      relationActorType,
      relationActorRole
    );
    relationId = createRelationResponse.body.data.createRelation.id;

    // Act
    // Update relation
    const responseUpdateRelation = await updateRelationMutation(
      relationId,
      `${relationDescription} + change`,
      `${relationActorName} + change`,
      `${relationActorType} + change`,
      `${relationActorRole} + change`
    );
    const responseUpdateRelationData =
      responseUpdateRelation.body.data.updateRelation;

    const getRelation = await getRelationsPerOpportunity(opportunityId);
    const relationData = getRelation.body.data.opportunity.relations[0];

    // Assert
    expect(getRelation.body.data.opportunity.aspects).toHaveLength(1);
    expect(responseUpdateRelation).toEqual(relationData);
  });

  test('should throw error for invalied relation type', async () => {
    // Act
    // Create Relation
    const createRelationResponse = await createRelationMutation(
      opportunityId,
      'testRelationType',
      relationDescription,
      relationActorName,
      relationActorRole,
      relationActorType
    );
    const response = createRelationResponse.body;

    // Assert
    expect(createRelationResponse.status).toBe(200);
    expect(response.errors[0].message).toContain(
      'Invalid relation type supplied: testRelationType'
    );
  });

  test('should create 2 relations for the same opportunity with the same name', async () => {
    // Act
    // Create 2 relations with same name
    await createRelationMutation(
      opportunityId,
      relationIncoming,
      relationDescription,
      relationActorName,
      relationActorRole,
      relationActorType
    );

    await createRelationMutation(
      opportunityId,
      relationOutgoing,
      relationDescription,
      relationActorName,
      relationActorRole,
      relationActorType
    );

    const responseQuery = await getRelationsPerOpportunity(opportunityId);

    // Assert
    expect(responseQuery.body.data.opportunity.relations).toHaveLength(2);
  });

  test('should remove created relation', async () => {
    // Arrange
    // Create relation
    const responseCreateRelation = await createRelationMutation(
      opportunityId,
      relationOutgoing,
      relationDescription,
      relationActorName,
      relationActorRole,
      relationActorType
    );
    const relationId = responseCreateRelation.body.data.createRelation.id;

    // Act
    const responseRemoveRelation = await removeRelationMutation(relationId);

    const responseQuery = await getRelationsPerOpportunity(opportunityId);

    // Assert
    expect(responseQuery.body.data.opportunity.relations).toHaveLength(0);
    expect(responseRemoveRelation.body.data.removeRelation).toEqual(true);
  });

  test('should throw error for removing unexisting relation', async () => {
    // Arrange
    // Create relation
    const responseCreateRelation = await createRelationMutation(
      opportunityId,
      relationOutgoing,
      relationDescription,
      relationActorName,
      relationActorRole,
      relationActorType
    );
    const relationId = responseCreateRelation.body.data.createRelation.id;

    // Act
    await removeRelationMutation(relationId);
    const responseRemoveRelation = await removeRelationMutation(relationId);

    const responseQuery = await getRelationsPerOpportunity(opportunityId);

    // Assert
    expect(responseQuery.body.data.opportunity.relations).toHaveLength(0);
    expect(responseRemoveRelation.body.errors[0].message).toEqual(
      `Not able to locate relation with the specified ID: ${relationId}`
    );
  });
});
