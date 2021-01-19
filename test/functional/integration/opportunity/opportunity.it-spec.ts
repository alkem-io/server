import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';
import {
  addUserToChallangeMutation,
  createChallangeMutation,
} from '@test/functional/integration/challenge/challenge.request.params';
import {
  addUserToOpportunityMutation,
  createOpportunityOnChallengeMutation,
  queryOpportunities,
  queryOpportunitiesSubEntities,
  queryOpportunity,
  queryOpportunitySubEntities,
  removeOpportunityMutation,
  updateOpportunityOnChallengeMutation,
} from './opportunity.request.params';
import {
  createAspectOnOpportunityMutation,
  getAspectPerOpportunity,
} from '../aspect/aspect.request.params';
import { createActorGroupMutation } from '../actor-groups/actor-groups.request.params';
import { createRelationMutation } from '../relations/relations.request.params';
import {
  createGroupOnChallengeMutation,
  createGroupOnOpportunityMutation,
} from '../group/group.request.params';
import {
  createProjectMutation,
  removeProjectMutation,
} from '../project/project.request.params';

const userId = '6';
let groupName = '';
let opportunityName = '';
let opportunityTextId = '';
let opportunityId = '';
let challengeName = '';
let challengeId = '';
let uniqueTextId = '';
let aspectId = '';
let aspectTitle = '';
let aspectFrame = '';
let aspectExplanation = '';
let actorGroupName = '';
let actorGroupDescription = '';
let relationId = '';
let relationDescription = '';
let relationActorName = '';
let relationActorType = '';
let relationActorRole = '';
const relationIncoming = 'incoming';
const relationOutgoing = 'outgoing';
let contextTagline = 'contextTagline';
let projectName = '';
let projectTextId = '';
let projectId = '';
beforeEach(async () => {
  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  groupName = `groupName ${uniqueTextId}`;
  challengeName = `testChallenge ${uniqueTextId}`;
  opportunityName = `opportunityName ${uniqueTextId}`;
  opportunityTextId = `${uniqueTextId}`;
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
  test('should remove all opportunity sub entities', async () => {
    // Arrange
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunityOnChallengeMutation(
      challengeId,
      opportunityName,
      opportunityTextId,
      contextTagline
    );

    opportunityId =
      responseCreateOpportunityOnChallenge.body.data
        .createOpportunityOnChallenge.id;

    // Create Aspect on opportunity group
    await createAspectOnOpportunityMutation(
      opportunityId,
      aspectTitle,
      aspectFrame,
      aspectExplanation
    );

    // Create Actor group
    await createActorGroupMutation(
      opportunityId,
      actorGroupName,
      actorGroupDescription
    );

    // Create Relation
    await createRelationMutation(
      opportunityId,
      relationIncoming,
      relationDescription,
      relationActorName,
      relationActorType,
      relationActorRole
    );

    // Add group to an opportunity
    await createGroupOnOpportunityMutation(groupName, opportunityId);

    ///  Create Project - enable this, when the implementation is in place ////

    // const responseCreateProject = await createProjectMutation(
    //   opportunityId,
    //   projectName,
    //   projectTextId
    // );
    // projectId = responseCreateProject.body.data.createProject.id;

    await removeOpportunityMutation(opportunityId);

    // Act
    // Get all opportunities
    const responseOpSubEntities = await queryOpportunitiesSubEntities();
    const baseResponse = responseOpSubEntities.body.data.opportunities;

    expect(baseResponse.aspects).toBe(undefined);
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

    expect(baseResponse).not.toEqual(
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
    const responseCreateOpportunityOnChallenge = await createOpportunityOnChallengeMutation(
      challengeId,
      opportunityName,
      opportunityTextId
    );

    const createOpportunityData =
      responseCreateOpportunityOnChallenge.body.data
        .createOpportunityOnChallenge;

    opportunityId =
      responseCreateOpportunityOnChallenge.body.data
        .createOpportunityOnChallenge.id;

    // Query Opportunity data
    const requestQueryOpportunity = await queryOpportunity(opportunityId);
    const requestOpportunityData =
      requestQueryOpportunity.body.data.opportunity;

    // Assert
    expect(responseCreateOpportunityOnChallenge.status).toBe(200);
    expect(createOpportunityData).toEqual(requestOpportunityData);
  });

  test('should update opportunity and query the data', async () => {
    // Arrange
    // Create Opportunity on Challenge
    const responseCreateOpportunityOnChallenge = await createOpportunityOnChallengeMutation(
      challengeId,
      opportunityName,
      opportunityTextId
    );

    opportunityId =
      responseCreateOpportunityOnChallenge.body.data
        .createOpportunityOnChallenge.id;

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
      requestQueryOpportunity.body.data.opportunity;

    // Assert
    expect(responseUpdateOpportunity.status).toBe(200);
    expect(updateOpportunityData).toEqual(requestOpportunityData);
  });

  test('should remove opportunity and query the data', async () => {
    // Arrange
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunityOnChallengeMutation(
      challengeId,
      opportunityName,
      opportunityTextId
    );

    opportunityId =
      responseCreateOpportunityOnChallenge.body.data
        .createOpportunityOnChallenge.id;

    // Act
    // Remove opportunity
    const removeOpportunityResponse = await removeOpportunityMutation(
      opportunityId
    );

    // Query Opportunity data
    const requestQueryOpportunity = await queryOpportunity(opportunityId);

    // Assert
    expect(responseCreateOpportunityOnChallenge.status).toBe(200);
    expect(removeOpportunityResponse.body.data.removeOpportunity).toEqual(true);
    expect(requestQueryOpportunity.body.errors[0].message).toEqual(
      `Unable to find Opportunity with ID: ${opportunityId}`
    );
  });

  test('should throw error for adding member to opportunity, without being in parent challenge', async () => {
    // Arrange
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunityOnChallengeMutation(
      challengeId,
      opportunityName,
      opportunityTextId
    );

    opportunityId =
      responseCreateOpportunityOnChallenge.body.data
        .createOpportunityOnChallenge.id;

    // Act
    // Add member to opportunity
    const addMemberResponse = await addUserToOpportunityMutation(
      opportunityId,
      1
    );

    // Query Opportunity data
    const requestQueryOpportunity = await queryOpportunity(opportunityId);

    // Assert
    expect(addMemberResponse.text).toContain(
      `User (1) is not a member of parent challenge: ${challengeId}`
    );
    expect(
      requestQueryOpportunity.body.data.opportunity.contributors
    ).toHaveLength(0);
  });

  test('should add member to opportunity', async () => {
    // Arrange
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunityOnChallengeMutation(
      challengeId,
      opportunityName,
      opportunityTextId
    );
    opportunityId =
      responseCreateOpportunityOnChallenge.body.data
        .createOpportunityOnChallenge.id;

    // Add user to a challenge
    await addUserToChallangeMutation(challengeId, userId);

    // Act
    // Add member to opportunity
    await addUserToOpportunityMutation(opportunityId, userId);

    // Query Opportunity data
    const requestQueryOpportunity = await queryOpportunity(opportunityId);

    // Assert
    expect(
      requestQueryOpportunity.body.data.opportunity.contributors[0].id
    ).toEqual(userId);
  });

  test('should get all opportunities', async () => {
    // Arrange
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunityOnChallengeMutation(
      challengeId,
      opportunityName,
      opportunityTextId
    );

    opportunityName =
      responseCreateOpportunityOnChallenge.body.data
        .createOpportunityOnChallenge.name;

    // Act
    // Get all opportunities
    const getAllOpportunityResponse = await queryOpportunities();

    // Assert
    expect(responseCreateOpportunityOnChallenge.status).toBe(200);
    expect(getAllOpportunityResponse.body.data.opportunities).toContainObject({
      name: `${opportunityName}`,
    });
  });

  test('should create opportunity with same name/textId on different challenges', async () => {
    // Arrange
    const responseCreateChallengeTwo = await createChallangeMutation(
      `${challengeName}ch`,
      `${uniqueTextId}ch`
    );
    const secondChallengeId =
      responseCreateChallengeTwo.body.data.createChallenge.id;

    // Act
    // Create Opportunity on Challange One
    const responseCreateOpportunityOnChallengeOne = await createOpportunityOnChallengeMutation(
      challengeId,
      opportunityName,
      opportunityTextId
    );

    const responseCreateOpportunityOnChallengeTwo = await createOpportunityOnChallengeMutation(
      secondChallengeId,
      opportunityName,
      opportunityTextId
    );

    // Assert
    expect(responseCreateOpportunityOnChallengeOne.status).toBe(200);
    expect(responseCreateOpportunityOnChallengeTwo.status).toBe(200);
    expect(
      responseCreateOpportunityOnChallengeOne.body.data
        .createOpportunityOnChallenge.name
    ).toEqual(
      responseCreateOpportunityOnChallengeTwo.body.data
        .createOpportunityOnChallenge.name
    );
    expect(
      responseCreateOpportunityOnChallengeOne.body.data
        .createOpportunityOnChallenge.textID
    ).toEqual(
      responseCreateOpportunityOnChallengeTwo.body.data
        .createOpportunityOnChallenge.textID
    );
  });
});

describe('Opportunity sub entities', () => {
  test('should throw error for creating 2 projects with same name/textId under the same opportunity', async () => {
    // Arrange
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunityOnChallengeMutation(
      challengeId,
      opportunityName,
      opportunityTextId,
      contextTagline
    );

    opportunityId =
      responseCreateOpportunityOnChallenge.body.data
        .createOpportunityOnChallenge.id;

    // Create Project
    const responseCreateProject = await createProjectMutation(
      opportunityId,
      projectName,
      projectTextId
    );
    const responseProjectData =
      responseCreateProject.body.data.createProject.name;

    const responseCreateOrojectSameTextId = await createProjectMutation(
      opportunityId,
      projectName + 'dif',
      projectTextId
    );

    const responseCreateOrojectSameName = await createProjectMutation(
      opportunityId,
      projectName,
      projectTextId + 'c'
    );

    // Act
    // Get opportunity
    const responseOpSubEntities = await queryOpportunitySubEntities(
      opportunityId
    );
    const baseResponse = responseOpSubEntities.body.data.opportunity;

    // Assert
    expect(baseResponse.projects).toHaveLength(1);
    expect(responseCreateOrojectSameTextId.text).toContain(
      `property textID has failed the following constraints: isUniqueTextId`
    );
    expect(responseCreateOrojectSameTextId.text).toContain(
      `property textID has failed the following constraints: isUniqueTextId`
    );
    expect(baseResponse.projects[0].name).toContain(responseProjectData);

    await removeProjectMutation(
      responseCreateProject.body.data.createProject.id
    );
  });

  test('should throw error for creating 2 aspects with same title under the same opportunity', async () => {
    // Arrange
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunityOnChallengeMutation(
      challengeId,
      opportunityName,
      opportunityTextId,
      contextTagline
    );

    opportunityId =
      responseCreateOpportunityOnChallenge.body.data
        .createOpportunityOnChallenge.id;

    // Create Aspect on opportunity group
    const createAspectResponse = await createAspectOnOpportunityMutation(
      opportunityId,
      aspectTitle,
      aspectFrame,
      aspectExplanation
    );
    const responseAspect = createAspectResponse.body.data.createAspect.title;

    // const getAspect = await getAspectPerOpportunity(opportunityId);
    // const aspectData = getAspect.body.data.opportunity.aspects[0];

    const createAspect2Response = await createAspectOnOpportunityMutation(
      opportunityId,
      aspectTitle,
      aspectFrame,
      aspectExplanation
    );

    // Act
    // Get opportunity
    const responseOpSubEntities = await queryOpportunitySubEntities(
      opportunityId
    );
    const baseResponse = responseOpSubEntities.body.data.opportunity;

    // Assert
    expect(baseResponse.aspects).toHaveLength(1);
    expect(createAspect2Response.text).toContain(
      `Already have an aspect with the provided title: ${aspectTitle}`
    );
    expect(baseResponse.aspects[0].title).toContain(responseAspect);
  });

  test('should throw error for creating 2 actor groups with same name/textId under the same opportunity', async () => {
    // Arrange
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunityOnChallengeMutation(
      challengeId,
      opportunityName,
      opportunityTextId,
      contextTagline
    );

    opportunityId =
      responseCreateOpportunityOnChallenge.body.data
        .createOpportunityOnChallenge.id;

    // Create Actor group
    const createActorGroupResponse = await createActorGroupMutation(
      opportunityId,
      actorGroupName,
      actorGroupDescription
    );
    const responseActorGroup =
      createActorGroupResponse.body.data.createActorGroup.name;

    const createActorGroup2Response = await createActorGroupMutation(
      opportunityId,
      actorGroupName,
      actorGroupDescription
    );

    // Act
    // Get opportunity
    const responseOpSubEntities = await queryOpportunitySubEntities(
      opportunityId
    );
    const baseResponse = responseOpSubEntities.body.data.opportunity;

    // Assert
    expect(baseResponse.actorGroups).toHaveLength(1);
    expect(createActorGroup2Response.text).toContain(
      `Already have an actor group with the provided name: ${actorGroupName}`
    );
    expect(baseResponse.actorGroups[0].name).toContain(responseActorGroup);
  });

  test('should get all opportunity sub entities', async () => {
    // Arrange
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunityOnChallengeMutation(
      challengeId,
      opportunityName,
      opportunityTextId,
      contextTagline
    );

    opportunityId =
      responseCreateOpportunityOnChallenge.body.data
        .createOpportunityOnChallenge.id;

    // Create Aspect on opportunity group
    const createAspectResponse = await createAspectOnOpportunityMutation(
      opportunityId,
      aspectTitle,
      aspectFrame,
      aspectExplanation
    );
    const responseAspect = createAspectResponse.body.data.createAspect.title;

    const getAspect = await getAspectPerOpportunity(opportunityId);
    const aspectData = getAspect.body.data.opportunity.aspects[0];

    // Create Project
    const responseCreateProject = await createProjectMutation(
      opportunityId,
      projectName,
      projectTextId
    );
    const responseProjectData =
      responseCreateProject.body.data.createProject.name;

    // Create Actor group
    const createActorGroupResponse = await createActorGroupMutation(
      opportunityId,
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

    // Add group to an opportunity
    const responseCreateGroupOnOpportunity = await createGroupOnOpportunityMutation(
      groupName,
      opportunityId
    );
    const groupNameResponse =
      responseCreateGroupOnOpportunity.body.data.createGroupOnOpportunity.name;

    // Act
    // Get all opportunities
    const responseOpSubEntities = await queryOpportunitySubEntities(
      opportunityId
    );
    const baseResponse = responseOpSubEntities.body.data.opportunity;

    // Assert

    expect(baseResponse.aspects).toHaveLength(1);
    expect(baseResponse.aspects[0].title).toContain(responseAspect);

    expect(baseResponse.projects).toHaveLength(1);
    expect(baseResponse.projects[0].name).toContain(responseProjectData);

    expect(baseResponse.actorGroups).toHaveLength(1);
    expect(baseResponse.actorGroups[0].name).toContain(responseActorGroup);

    expect(baseResponse.relations).toHaveLength(1);
    expect(baseResponse.relations[0].actorName).toEqual(responseCreateRelation);

    expect(baseResponse.groups).toHaveLength(2);
    expect(baseResponse.groups[0]).toEqual({
      name: `members`,
    });
    expect(baseResponse.groups[1].name).toEqual(groupNameResponse);

    expect(baseResponse.context.tagline).toEqual(`${contextTagline}`);

    await removeProjectMutation(
      responseCreateProject.body.data.createProject.id
    );
  });
});

describe('DDT should not create opportunities with same name or textId within the same challenge', () => {
  // Arrange
  test.each`
    opportunityNameD | opportunityTextIdD | expected
    ${'opp name a'}  | ${'opp-textid-a'}  | ${'opp name a'}
    ${'opp name b'}  | ${'opp-textid-a'}  | ${'Trying to create an opportunity but one with the given textID already exists: opp-textid-a'}
    ${'opp name a'}  | ${'opp-textid-b'}  | ${'Opportunity with name: opp name a already exists!'}
    ${'opp name b'}  | ${'opp-textid-b'}  | ${'opp name b'}
  `(
    "should expect: '$expected' for opportunity creation with name: '$opportunityNameD' and textId: '$opportunityTextIdD'",
    async ({ opportunityNameD, opportunityTextIdD, expected }) => {
      // Act
      // Create Opportunity
      const responseCreateOpportunityOnChallenge = await createOpportunityOnChallengeMutation(
        '1',
        opportunityNameD,
        opportunityTextIdD
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
