import '@utils/array.matcher';
import { appSingleton } from '@utils/app.singleton';
import { createChallangeMutation } from '@domain/challenge/challenge.request.params';
import {
  createAspectOnProjectMutation,
  removeAspectMutation,
  updateAspectMutation,
  getAspectPerProject,
} from './aspect.request.params';
import { createOpportunityOnChallengeMutation } from '@domain/opportunity/opportunity.request.params';
import { createProjectMutation } from '@domain/project/project.request.params';

let opportunityName = '';
let opportunityTextId = '';
let opportunityId = '';
let projectName = '';
let projectTextId = '';
let projectId = '';
let challengeName = '';
let challengeId = '';
let aspectId = '';
let aspectTitle = '';
let aspectFrame = '';
let aspectExplanation = '';
let uniqueTextId = '';
beforeEach(async () => {
  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  challengeName = `testChallenge ${uniqueTextId}`;
  opportunityName = `opportunityName ${uniqueTextId}`;
  opportunityTextId = `${uniqueTextId}`;
  projectName = `projectName ${uniqueTextId}`;
  projectTextId = `pr${uniqueTextId}`;
  aspectTitle = `aspectTitle-${uniqueTextId}`;
  aspectFrame = `aspectFrame-${uniqueTextId}`;
  aspectExplanation = `aspectExplanation-${uniqueTextId}`;
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

  // Create Project
  const responseCreateProject = await createProjectMutation(
    opportunityId,
    projectName,
    projectTextId
  );
  projectId = responseCreateProject.body.data.createProject.id;
});

describe('Aspect on Project', () => {
  test('should create aspect on project', async () => {
    // Act
    // Create Aspect
    const createAspectResponse = await createAspectOnProjectMutation(
      projectId,
      aspectTitle,
      aspectFrame,
      aspectExplanation
    );
    const response = createAspectResponse.body.data.createAspectOnProject;

    const getAspect = await getAspectPerProject(opportunityId);
    const aspectData = getAspect.body.data.opportunity.projects[0].aspects[0];

    // Assert
    expect(createAspectResponse.status).toBe(200);
    expect(response.title).toEqual(aspectTitle);
    expect(response.framing).toEqual(aspectFrame);
    expect(response.explanation).toEqual(aspectExplanation);
    expect(response).toEqual(aspectData);
  });

  test('should create 2 aspects for the same project', async () => {
    // Act
    // Create 2 Aspects with different names
    await createAspectOnProjectMutation(
      projectId,
      aspectTitle,
      aspectFrame,
      aspectExplanation
    );

    await createAspectOnProjectMutation(
      projectId,
      aspectTitle + aspectTitle,
      aspectFrame,
      aspectExplanation
    );

    const responseQuery = await getAspectPerProject(opportunityId);

    // Assert
    expect(
      responseQuery.body.data.opportunity.projects[0].aspects
    ).toHaveLength(2);
  });

  test('should NOT create 2 aspects for the same project with same name', async () => {
    // Act
    // Create 2 Aspects with same names
    await createAspectOnProjectMutation(
      projectId,
      aspectTitle,
      aspectFrame,
      aspectExplanation
    );

    const responseSecondAspect = await createAspectOnProjectMutation(
      projectId,
      aspectTitle,
      aspectFrame,
      aspectExplanation
    );

    const responseQuery = await getAspectPerProject(opportunityId);

    // Assert
    expect(
      responseQuery.body.data.opportunity.projects[0].aspects
    ).toHaveLength(1);
    expect(responseSecondAspect.body.errors[0].message).toEqual(
      `Already have an aspect with the provided title: ${aspectTitle}`
    );
  });

  test('should update aspect on project', async () => {
    // Arrange
    // Create Aspect
    const createAspectResponse = await createAspectOnProjectMutation(
      projectId,
      aspectTitle,
      aspectFrame,
      aspectExplanation
    );
    aspectId = createAspectResponse.body.data.createAspectOnProject.id;

    // Act
    // Update Aspect
    const responseUpdateAspect = await updateAspectMutation(
      aspectId,
      `${aspectTitle} + change`,
      `${aspectFrame} + change`,
      `${aspectExplanation} + change`
    );

    const responseUpdateAspectData =
      responseUpdateAspect.body.data.updateAspect;

    const getAspect = await getAspectPerProject(opportunityId);
    const aspectData = getAspect.body.data.opportunity.projects[0].aspects[0];

    // Assert
    expect(getAspect.body.data.opportunity.projects[0].aspects).toHaveLength(1);
    expect(responseUpdateAspectData).toEqual(aspectData);
  });

  test('should remove created aspect from project', async () => {
    // Arrange
    // Create aspect
    const responseCreateAspect = await createAspectOnProjectMutation(
      projectId,
      aspectTitle,
      aspectFrame,
      aspectExplanation
    );
    aspectId = responseCreateAspect.body.data.createAspectOnProject.id;

    // Act
    // Remove aspect
    const responseRemoveAaspect = await removeAspectMutation(aspectId);

    const responseQuery = await getAspectPerProject(opportunityId);

    // Assert
    expect(
      responseQuery.body.data.opportunity.projects[0].aspects
    ).toHaveLength(0);
    expect(responseRemoveAaspect.body.data.removeAspect).toEqual(true);
  });
});
