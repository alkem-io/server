import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';
import { createChallangeMutation } from '@test/functional/integration/challenge/challenge.request.params';
import {
  createAspectOnProjectMutation,
  removeAspectMutation,
  updateAspectMutation,
  getAspectPerProject,
} from './aspect.request.params';
import { createOpportunityOnChallengeMutation } from '@test/functional/integration/opportunity/opportunity.request.params';
import { createProjectMutation } from '@test/functional/integration/project/project.request.params';

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
let aspectDataCreate = '';
let aspectCountPerProject = async (): Promise<number> => {
  const responseQuery = await getAspectPerProject(opportunityId);
  let response = responseQuery.body.data.opportunity.projects[0].aspects;
  return response;
};

let aspectDataPerPerproject = async (): Promise<String> => {
  const responseQuery = await getAspectPerProject(opportunityId);
  let response = responseQuery.body.data.opportunity.projects[0].aspects[0];
  return response;
};
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

  // Create Aspect
  const createAspectResponse = await createAspectOnProjectMutation(
    projectId,
    aspectTitle,
    aspectFrame,
    aspectExplanation
  );
  aspectDataCreate = createAspectResponse.body.data.createAspectOnProject;
  aspectId = createAspectResponse.body.data.createAspectOnProject.id;
});

afterEach(async () => {
  await removeAspectMutation(aspectId);
});

describe('Aspect on Project', () => {
  test('should assert created aspect on project', async () => {
    // Assert
    expect(await aspectDataPerPerproject()).toEqual(aspectDataCreate);
  });

  test('should create 2 aspects for the same project', async () => {
    // Act
    // Create second aspect with different names
    await createAspectOnProjectMutation(
      projectId,
      aspectTitle + aspectTitle,
      aspectFrame,
      aspectExplanation
    );

    // Assert
    expect(await aspectCountPerProject()).toHaveLength(2);
  });

  test('should NOT create 2 aspects for the same project with same name', async () => {
    // Act
    // Create second aspect with same names
    const responseSecondAspect = await createAspectOnProjectMutation(
      projectId,
      aspectTitle,
      aspectFrame,
      aspectExplanation
    );

    // Assert
    expect(await aspectCountPerProject()).toHaveLength(1);
    expect(responseSecondAspect.body.errors[0].message).toEqual(
      `Already have an aspect with the provided title: ${aspectTitle}`
    );
  });

  test('should update aspect on project', async () => {
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

    // Assert
    expect(await aspectCountPerProject()).toHaveLength(1);
    expect(responseUpdateAspectData).toEqual(await aspectDataPerPerproject());
  });

  test('should remove created aspect from project', async () => {
    // Act
    // Remove aspect
    const responseRemoveAaspect = await removeAspectMutation(aspectId);

    // Assert
    expect(await aspectCountPerProject()).toHaveLength(0);
    expect(responseRemoveAaspect.body.data.removeAspect).toEqual(true);
  });
});
