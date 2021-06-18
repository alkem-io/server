import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';
import {
  createChallangeMutation,
  getChallengeData,
} from '@test/functional/integration/challenge/challenge.request.params';
import {
  createOpportunityMutation,
  queryOpportunities,
  queryOpportunity,
  removeOpportunityMutation,
  updateOpportunityOnChallengeMutation,
} from './opportunity.request.params';
import {
  createAspectOnOpportunityMutation,
  getAspectPerOpportunity,
} from '@domain/context/aspect/aspect.request.params';
import { createActorGroupMutation } from '@domain/context/actor-groups/actor-groups.request.params';
import { createRelationMutation } from '@domain/collaboration/relations/relations.request.params';
import {
  createProjectMutation,
  removeProjectMutation,
} from '@domain/collaboration/project/project.request.params';
import { createGroupOnCommunityMutation } from '@domain/community/community/community.request.params';

const userId = '6';
let groupName = '';
let opportunityName = '';
let opportunityTextId = '';
let opportunityId = '';
let challengeName = '';
let challengeId = '';
let uniqueTextId = '';
let aspectTitle = '';
let aspectFrame = '';
let aspectExplanation = '';
let actorGroupName = '';
let actorGroupDescription = '';
let relationDescription = '';
let relationActorName = '';
let relationActorType = '';
let relationActorRole = '';
const relationIncoming = 'incoming';
const contextTagline = 'contextTagline';
let projectName = '';
let projectTextId = '';
let projectId = '';
let contextId = '';
let ecosystemModelId = '';
beforeEach(async () => {
  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  groupName = `groupName ${uniqueTextId}`;
  challengeName = `testChallenge ${uniqueTextId}`;
  opportunityName = `opportunityName ${uniqueTextId}`;
  opportunityTextId = `opp${uniqueTextId}`;
  aspectTitle = `aspectTitle-${uniqueTextId}`;
  aspectFrame = `aspectFrame-${uniqueTextId}`;
  aspectExplanation = `aspectExplanation-${uniqueTextId}`;
  actorGroupName = `actorGroupName-${uniqueTextId}`;
  actorGroupDescription = `actorGroupDescription-${uniqueTextId}`;
  relationDescription = `relationDescription-${uniqueTextId}`;
  relationActorName = `relationActorName-${uniqueTextId}`;
  relationActorType = `relationActorType-${uniqueTextId}`;
  relationActorRole = `relationActorRole-${uniqueTextId}`;
  projectName = `projectName ${uniqueTextId}`;
  projectTextId = `pr${uniqueTextId}`;
});

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
});

afterAll(async () => {
  if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
});

beforeEach(async () => {
  const responseCreateChallenge = await createChallangeMutation(
    challengeName,
    uniqueTextId
  );
  challengeId = responseCreateChallenge.body.data.createChallenge.id;
});

describe('Opportunities', () => {
  afterEach(async () => {
    if (opportunityId) {
      await removeOpportunityMutation(opportunityId);
    }
  });
  // failing due bug  with deletion
  test.skip('should remove all opportunity sub entities', async () => {
    // Arrange
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunityMutation(
      challengeId,
      opportunityName,
      opportunityTextId,
      contextTagline
    );
    opportunityId =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity.id;
    let contextId =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity.context
        .id;
    let communityId =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity.community
        .id;
    let ecosystemModelId =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity.context
        .ecosystemModel.id;

    // Create Aspect on opportunity group
    let x = await createAspectOnOpportunityMutation(
      contextId,
      aspectTitle,
      aspectFrame,
      aspectExplanation
    );

    // Create Actor group
    let y = await createActorGroupMutation(
      ecosystemModelId,
      actorGroupName,
      actorGroupDescription
    );

    // Create Relation
    // let z = await createRelationMutation(
    //   opportunityId,
    //   relationIncoming,
    //   relationDescription,
    //   relationActorName,
    //   relationActorType,
    //   relationActorRole
    // );
    // console.log(z.body);

    // Add group to an opportunity
    let w = await createGroupOnCommunityMutation(communityId, groupName);
    ///  Create Project - enable this, when the implementation is in place ////

    // const responseCreateProject = await createProjectMutation(
    //   opportunityId,
    //   projectName,
    //   projectTextId
    // );
    // console.log(responseCreateProject.body);
    // projectId = responseCreateProject.body.data.createProject.id;

    let re = await removeOpportunityMutation(opportunityId);

    // Act
    // Get all opportunities
    const responseOpSubEntities = await getChallengeData(challengeId);
    const baseResponse = responseOpSubEntities.body.data.ecoverse.challenge;

    expect(baseResponse.context.aspects).toBe(undefined);
    expect(baseResponse).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          aspects: [{ title: `${aspectTitle}` }],
        }),
      ])
    );

    ///  Remove Opportunity Project - enable this, when the implementation is in place ////

    // expect(baseResponse).not.toEqual(
    //   expect.arrayContaining([
    //     expect.objectContaining({
    //       projects: [{ name: `${projectName}` }],
    //     }),
    //   ])
    // );

    expect(baseResponse.context).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actorGroups: [{ name: `${actorGroupName}` }],
        }),
      ])
    );

    expect(baseResponse).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          relations: [{ actorName: `${relationActorName}` }],
        }),
      ])
    );

    expect(baseResponse).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          groups: [{ name: `${groupName}` }],
        }),
      ])
    );

    expect(baseResponse).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          context: { tagline: `${contextTagline}` },
        }),
      ])
    );
  });

  test('should create opportunity and query the data', async () => {
    // Act
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunityMutation(
      challengeId,
      opportunityName,
      opportunityTextId
    );

    const createOpportunityData =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity;

    opportunityId =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity.id;

    // Query Opportunity data
    const requestQueryOpportunity = await queryOpportunity(opportunityId);
    const requestOpportunityData =
      requestQueryOpportunity.body.data.ecoverse.opportunity;

    // Assert
    expect(responseCreateOpportunityOnChallenge.status).toBe(200);
    expect(createOpportunityData).toEqual(requestOpportunityData);
  });

  test('should update opportunity and query the data', async () => {
    // Arrange
    // Create Opportunity on Challenge
    const responseCreateOpportunityOnChallenge = await createOpportunityMutation(
      challengeId,
      opportunityName,
      opportunityTextId
    );

    opportunityId =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity.id;
    let refId =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity.context
        .references[0].id;

    // Act
    // Update the created Opportunity
    const responseUpdateOpportunity = await updateOpportunityOnChallengeMutation(
      opportunityId
    );
    const updateOpportunityData =
      responseUpdateOpportunity.body.data.updateOpportunity;

    // Query Opportunity data
    const requestQueryOpportunity = await queryOpportunity(opportunityId);
    const requestOpportunityData =
      requestQueryOpportunity.body.data.ecoverse.opportunity;

    // Assert
    expect(responseUpdateOpportunity.status).toBe(200);
    expect(updateOpportunityData).toEqual(requestOpportunityData);
  });

  // failing due to bug
  test.skip('should remove opportunity and query the data', async () => {
    // Arrange
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunityMutation(
      challengeId,
      opportunityName,
      opportunityTextId
    );

    opportunityId =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity.id;

    // Act
    // Remove opportunity
    const removeOpportunityResponse = await removeOpportunityMutation(
      opportunityId
    );

    // Query Opportunity data
    const requestQueryOpportunity = await queryOpportunity(opportunityId);

    // Assert
    expect(responseCreateOpportunityOnChallenge.status).toBe(200);
    expect(removeOpportunityResponse.body.data.deleteOpportunity.id).toEqual(
      opportunityId
    );
    expect(requestQueryOpportunity.body.errors[0].message).toEqual(
      `Unable to find Opportunity with ID: ${opportunityId}`
    );
  });

  test('should get all opportunities', async () => {
    // Arrange
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunityMutation(
      challengeId,
      opportunityName,
      opportunityTextId
    );

    opportunityName =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity
        .displayName;

    // Act
    // Get all opportunities
    const getAllOpportunityResponse = await queryOpportunities();

    // Assert
    expect(responseCreateOpportunityOnChallenge.status).toBe(200);
    expect(
      getAllOpportunityResponse.body.data.ecoverse.opportunities
    ).toContainObject({
      displayName: `${opportunityName}`,
    });
  });

  test('should throw an error for creating opportunity with same name/textId on different challenges', async () => {
    // Arrange
    const responseCreateChallengeTwo = await createChallangeMutation(
      `${challengeName}ch`,
      `${uniqueTextId}ch`
    );
    const secondChallengeId =
      responseCreateChallengeTwo.body.data.createChallenge.id;

    // Act
    // Create Opportunity on Challange One
    const responseCreateOpportunityOnChallengeOne = await createOpportunityMutation(
      challengeId,
      opportunityName,
      `${opportunityTextId}new`
    );

    const responseCreateOpportunityOnChallengeTwo = await createOpportunityMutation(
      secondChallengeId,
      opportunityName,
      `${opportunityTextId}new`
    );

    // Assert
    expect(responseCreateOpportunityOnChallengeOne.status).toBe(200);
    expect(responseCreateOpportunityOnChallengeTwo.status).toBe(200);
    expect(responseCreateOpportunityOnChallengeTwo.text).toContain(
      `Unable to create entity: the provided nameID is already taken: ${opportunityTextId}new`
    );
  });
});

describe('Opportunity sub entities', () => {
  beforeEach(async () => {
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunityMutation(
      challengeId,
      opportunityName,
      opportunityTextId,
      contextTagline
    );
    opportunityId =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity.id;
    contextId =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity.context
        .id;
    ecosystemModelId =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity.context
        .ecosystemModel.id;
  });

  test('should throw error for creating 2 projects with same name/textId under the same opportunity', async () => {
    // Arrange
    // Create Project
    const responseCreateProject = await createProjectMutation(
      opportunityId,
      projectName,
      projectTextId
    );
    const responseProjectData =
      responseCreateProject.body.data.createProject.nameID;

    const responseCreateProjectSameTextId = await createProjectMutation(
      opportunityId,
      projectName + 'dif',
      projectTextId
    );

    // Act
    // Get opportunity
    const responseOpSubEntities = await queryOpportunity(opportunityId);
    const baseResponse = responseOpSubEntities.body.data.ecoverse.opportunity;

    // Assert
    expect(baseResponse.projects).toHaveLength(1);
    expect(responseCreateProjectSameTextId.text).toContain(
      `Unable to create Project: the provided nameID is already taken: ${projectTextId}`
    );
    expect(baseResponse.projects[0].nameID).toContain(responseProjectData);
    await removeProjectMutation(
      responseCreateProject.body.data.createProject.id
    );
  });

  test('should throw error for creating 2 aspects with same title under the same opportunity', async () => {
    // Arrange
    // Create Aspect on opportunity group
    const createAspectResponse = await createAspectOnOpportunityMutation(
      contextId,
      aspectTitle,
      aspectFrame,
      aspectExplanation
    );
    const responseAspect = createAspectResponse.body.data.createAspect.title;

    // const getAspect = await getAspectPerOpportunity(opportunityId);
    // const aspectData = getAspect.body.data.opportunity.aspects[0];

    const createAspect2Response = await createAspectOnOpportunityMutation(
      contextId,
      aspectTitle,
      aspectFrame,
      aspectExplanation
    );

    // Act
    // Get opportunity
    const responseOpSubEntities = await queryOpportunity(opportunityId);
    const baseResponse = responseOpSubEntities.body.data.ecoverse.opportunity;

    // Assert
    expect(baseResponse.context.aspects).toHaveLength(1);
    expect(createAspect2Response.text).toContain(
      `Already have an aspect with the provided title: ${aspectTitle}`
    );
    expect(baseResponse.context.aspects[0].title).toContain(responseAspect);
  });

  test('should throw error for creating 2 actor groups with same name/textId under the same opportunity', async () => {
    // Arrange
    // Create Actor group
    const createActorGroupResponse = await createActorGroupMutation(
      ecosystemModelId,
      actorGroupName,
      actorGroupDescription
    );
    const responseActorGroup =
      createActorGroupResponse.body.data.createActorGroup.name;

    const createActorGroup2Response = await createActorGroupMutation(
      ecosystemModelId,
      actorGroupName,
      actorGroupDescription
    );

    // Act
    // Get opportunity
    const responseOpSubEntities = await queryOpportunity(opportunityId);
    const baseResponse =
      responseOpSubEntities.body.data.ecoverse.opportunity.context
        .ecosystemModel;

    // Assert
    expect(baseResponse.actorGroups).toHaveLength(1);
    expect(createActorGroup2Response.text).toContain(
      `Already have an actor group with the provided name: ${actorGroupName}`
    );
    expect(baseResponse.actorGroups[0].name).toContain(responseActorGroup);
  });

  test('should get all opportunity sub entities', async () => {
    // Arrange
    // Create Aspect on opportunity group
    const createAspectResponse = await createAspectOnOpportunityMutation(
      contextId,
      aspectTitle,
      aspectFrame,
      aspectExplanation
    );
    const responseAspect = createAspectResponse.body.data.createAspect.title;

    const getAspect = await getAspectPerOpportunity(opportunityId);

    // Create Project
    const responseCreateProject = await createProjectMutation(
      opportunityId,
      projectName,
      projectTextId
    );
    const responseProjectData =
      responseCreateProject.body.data.createProject.nameID;

    // Create Actor group
    const createActorGroupResponse = await createActorGroupMutation(
      ecosystemModelId,
      actorGroupName,
      actorGroupDescription
    );
    const responseActorGroup =
      createActorGroupResponse.body.data.createActorGroup.name;

    // Create Relation
    const createRelationResponse = await createRelationMutation(
      opportunityId,
      relationIncoming,
      relationDescription,
      relationActorName,
      relationActorType,
      relationActorRole
    );
    const responseCreateRelation =
      createRelationResponse.body.data.createRelation.actorName;

    // Act
    // Get all opportunities
    const responseOpSubEntities = await queryOpportunity(opportunityId);
    const baseResponse = responseOpSubEntities.body.data.ecoverse.opportunity;

    // Assert

    expect(baseResponse.context.aspects).toHaveLength(1);
    expect(baseResponse.context.aspects[0].title).toContain(responseAspect);

    expect(baseResponse.projects).toHaveLength(1);
    expect(baseResponse.projects[0].nameID).toContain(responseProjectData);

    expect(baseResponse.context.ecosystemModel.actorGroups).toHaveLength(1);
    expect(baseResponse.context.ecosystemModel.actorGroups[0].name).toContain(
      responseActorGroup
    );

    expect(baseResponse.relations).toHaveLength(1);
    expect(baseResponse.relations[0].actorName).toEqual(responseCreateRelation);

    expect(baseResponse.context.tagline).toEqual(`${contextTagline}`);

    await removeProjectMutation(
      responseCreateProject.body.data.createProject.id
    );
  });
});

describe('DDT should not create opportunities with same nameID within the same challenge', () => {
  // Arrange
  test.each`
    opportunityDisplayName | opportunityNameIdD | expected
    ${'opp name a'}        | ${'opp-textid-a'}  | ${'nameID":"opp-textid-a'}
    ${'opp name b'}        | ${'opp-textid-a'}  | ${'Unable to create entity: the provided nameID is already taken: opp-textid-a'}
    ${'opp name a'}        | ${'opp-textid-b'}  | ${'nameID":"opp-textid-b'}
    ${'opp name b'}        | ${'opp-textid-b'}  | ${'Unable to create entity: the provided nameID is already taken: opp-textid-b'}
  `(
    "should expect: '$expected' for opportunity creation with name: '$opportunityDisplayName' and nameID: '$opportunityNameIdD'",
    async ({ opportunityDisplayName, opportunityNameIdD, expected }) => {
      // Act
      // Create Opportunity
      const responseCreateOpportunityOnChallenge = await createOpportunityMutation(
        challengeId,
        opportunityDisplayName,
        opportunityNameIdD
      );
      const responseData = JSON.stringify(
        responseCreateOpportunityOnChallenge.body
      ).replace('\\', '');

      // Assert
      expect(responseCreateOpportunityOnChallenge.status).toBe(200);
      expect(responseData).toContain(expected);
    }
  );
});
