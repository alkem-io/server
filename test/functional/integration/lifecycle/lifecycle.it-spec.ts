import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';
import {
  createChallangeMutation,
  getChallengeData,
} from '@test/functional/integration/challenge/challenge.request.params';

import {
  createProjectMutation,
  getProjectData,
} from '@domain/collaboration/project/project.request.params';
import {
  createOpportunityMutation,
  queryOpportunity,
} from '../opportunity/opportunity.request.params';
import {
  eventOnApplicationMutation,
  eventOnChallengeMutation,
  eventOnOpportunityMutation,
  eventOnProjectMutation,
} from './lifecycle.request.params';
import { createUserDetailsMutation } from '@test/functional/e2e/user-management/user.request.params';
import {
  createApplicationMutation,
  getApplication,
} from '@test/functional/e2e/user-management/application/application.request.params';
import { getCommunityData } from '@domain/community/community/community.request.params';

let opportunityName = '';
let opportunityTextId = '';
let opportunityId = '';
let challengeName = '';
let challengeId = '';
let uniqueTextId = '';
const contextTagline = 'contextTagline';
let projectId = '';
let projectName = '';
let projectTextId = '';
let userName = '';
let applicationId = '';
let applicationData;
let userFirstName = '';
let userLastName = '';
let userId = '';
let userPhone = '';
let userEmail = '';
let ecoverseCommunityId = '';
let groupName = '';

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
});

afterAll(async () => {
  if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
});

describe('Lifecycle', () => {
  describe('Update entity state - negative scenarios', () => {
    beforeAll(async () => {
      uniqueTextId = Math.random()
        .toString(36)
        .slice(-6);
      groupName = `groupName ${uniqueTextId}`;
      challengeName = `testChallenge ${uniqueTextId}`;
      opportunityName = `opportunityName ${uniqueTextId}`;
      opportunityTextId = `opp${uniqueTextId}`;
      projectName = `projectName ${uniqueTextId}`;
      projectTextId = `pr${uniqueTextId}`;
      // Create Challenge
      const responseCreateChallenge = await createChallangeMutation(
        challengeName,
        uniqueTextId
      );
      challengeId = responseCreateChallenge.body.data.createChallenge.id;
    });
    // Arrange
    test.each`
      setEvent       | setInvalidEvent | state             | nextEvents
      ${'REFINE'}    | ${'ARCHIVE'}    | ${'beingRefined'} | ${['REFINE', 'ABANDONED']}
      ${'ACTIVE'}    | ${'ARCHIVE'}    | ${'inProgress'}   | ${['ACTIVE', 'ABANDONED']}
      ${'COMPLETED'} | ${'ARCHIVE'}    | ${'complete'}     | ${['COMPLETED', 'ABANDONED']}
      ${'ARCHIVE'}   | ${'ACTIVE'}     | ${'archived'}     | ${['ARCHIVE', 'ABANDONED']}
    `(
      'should update challenge, when set event: "$setEvent" to state: "$state", nextEvents: "$nextEvents"',
      async ({ setEvent, setInvalidEvent, state, nextEvents }) => {
        // Act
        let updateState = await eventOnChallengeMutation(
          challengeId,
          setInvalidEvent
        );
        // Assert
        expect(updateState.text).toContain(
          `Unable to update state: provided event (${setInvalidEvent}) not in valid set of next events: ${nextEvents}`
        );
        await eventOnChallengeMutation(challengeId, setEvent);
      }
    );
  });

  describe('Update entity state - positive path - ABANDONED', () => {
    beforeAll(async () => {
      uniqueTextId = Math.random()
        .toString(36)
        .slice(-6);
      groupName = `groupName ${uniqueTextId}`;
      challengeName = `testChallenge ${uniqueTextId}`;
      opportunityName = `opportunityName ${uniqueTextId}`;
      opportunityTextId = `${uniqueTextId}`;
      projectName = `projectName ${uniqueTextId}`;
      projectTextId = `pr${uniqueTextId}`;
      // Create Challenge
      const responseCreateChallenge = await createChallangeMutation(
        challengeName,
        uniqueTextId
      );
      challengeId = responseCreateChallenge.body.data.createChallenge.id;
    });
    // Arrange
    test.each`
      setEvent       | state           | nextEvents
      ${'ABANDONED'} | ${'abandoned'}  | ${['REOPEN', 'ARCHIVE']}
      ${'REOPEN'}    | ${'inProgress'} | ${['COMPLETED', 'ABANDONED']}
      ${'ABANDONED'} | ${'abandoned'}  | ${['REOPEN', 'ARCHIVE']}
      ${'REOPEN'}    | ${'inProgress'} | ${['COMPLETED', 'ABANDONED']}
      ${'COMPLETED'} | ${'complete'}   | ${['ARCHIVE', 'ABANDONED']}
      ${'ARCHIVE'}   | ${'archived'}   | ${[]}
    `(
      'should update challenge, when set event: "$setEvent" to state: "$state", nextEvents: "$nextEvents"',
      async ({ setEvent, state, nextEvents }) => {
        // Act
        let updateState = await eventOnChallengeMutation(challengeId, setEvent);
        let data = updateState.body.data.eventOnChallenge.lifecycle;
        let challengeData = await getChallengeData(challengeId);
        let challengeDataResponse =
          challengeData.body.data.ecoverse.challenge.lifecycle;

        // Assert
        expect(data.state).toEqual(state);
        expect(data.nextEvents).toEqual(nextEvents);
        expect(data).toEqual(challengeDataResponse);
      }
    );
  });

  describe('Update entity state - positive path - REFINE', () => {
    beforeAll(async () => {
      uniqueTextId = Math.random()
        .toString(36)
        .slice(-6);
      groupName = `groupName ${uniqueTextId}`;
      challengeName = `testChallenge ${uniqueTextId}`;
      opportunityName = `opportunityName ${uniqueTextId}`;
      opportunityTextId = `opp${uniqueTextId}`;
      projectName = `projectName ${uniqueTextId}`;
      projectTextId = `pr${uniqueTextId}`;
      // Create Challenge
      const responseCreateChallenge = await createChallangeMutation(
        challengeName,
        uniqueTextId
      );
      challengeId = responseCreateChallenge.body.data.createChallenge.id;

      // Create Opportunity
      const responseCreateOpportunityOnChallenge = await createOpportunityMutation(
        challengeId,
        opportunityName,
        opportunityTextId,
        contextTagline
      );
      opportunityId =
        responseCreateOpportunityOnChallenge.body.data.createOpportunity.id;

      // Create Project
      const responseCreateProject = await createProjectMutation(
        opportunityId,
        projectName,
        projectTextId
      );

      projectId = responseCreateProject.body.data.createProject.id;
    });

    // Arrange
    test.each`
      setEvent       | state             | nextEvents
      ${'REFINE'}    | ${'beingRefined'} | ${['ACTIVE', 'ABANDONED']}
      ${'ACTIVE'}    | ${'inProgress'}   | ${['COMPLETED', 'ABANDONED']}
      ${'COMPLETED'} | ${'complete'}     | ${['ARCHIVE', 'ABANDONED']}
      ${'ARCHIVE'}   | ${'archived'}     | ${[]}
    `(
      'should update challenge, when set event: "$setEvent" to state: "$state", nextEvents: "$nextEvents"',
      async ({ setEvent, state, nextEvents }) => {
        // Act
        let updateState = await eventOnChallengeMutation(challengeId, setEvent);
        let data = updateState.body.data.eventOnChallenge.lifecycle;
        let challengeData = await getChallengeData(challengeId);
        let challengeDataResponse =
          challengeData.body.data.ecoverse.challenge.lifecycle;

        // Assert
        expect(data.state).toEqual(state);
        expect(data.nextEvents).toEqual(nextEvents);
        expect(data).toEqual(challengeDataResponse);
      }
    );

    // Arrange
    test.each`
      setEvent       | state             | nextEvents
      ${'REFINE'}    | ${'beingRefined'} | ${['ACTIVE', 'ABANDONED']}
      ${'ACTIVE'}    | ${'inProgress'}   | ${['COMPLETED', 'ABANDONED']}
      ${'COMPLETED'} | ${'complete'}     | ${['ARCHIVE', 'ABANDONED']}
      ${'ARCHIVE'}   | ${'archived'}     | ${[]}
    `(
      'should update opportunity, when set event: "$setEvent" to state: "$state", nextEvents: "$nextEvents"',
      async ({ setEvent, state, nextEvents }) => {
        // Act
        let updateState = await eventOnOpportunityMutation(
          opportunityId,
          setEvent
        );
        let data = updateState.body.data.eventOnOpportunity.lifecycle;
        let opportunityData = await queryOpportunity(opportunityId);
        let opportunityDataResponse =
          opportunityData.body.data.ecoverse.opportunity.lifecycle;

        // Assert
        expect(data.state).toEqual(state);
        expect(data.nextEvents).toEqual(nextEvents);
        expect(data).toEqual(opportunityDataResponse);
      }
    );

    // Arrange
    test.each`
      setEvent       | state             | nextEvents
      ${'REFINE'}    | ${'beingRefined'} | ${['ACTIVE', 'ABANDONED']}
      ${'ACTIVE'}    | ${'inProgress'}   | ${['COMPLETED', 'ABANDONED']}
      ${'COMPLETED'} | ${'complete'}     | ${['ARCHIVE', 'ABANDONED']}
      ${'ARCHIVE'}   | ${'archived'}     | ${[]}
    `(
      'should update project, when set event: "$setEvent" to state: "$state", nextEvents: "$nextEvents"',
      async ({ setEvent, state, nextEvents }) => {
        // Act
        let updateState = await eventOnProjectMutation(projectId, setEvent);
        let data = updateState.body.data.eventOnProject.lifecycle;
        let projectData = await getProjectData(projectId);
        let projectDataResponse =
          projectData.body.data.ecoverse.project.lifecycle;

        // Assert
        expect(data.state).toEqual(state);
        expect(data.nextEvents).toEqual(nextEvents);
        expect(data).toEqual(projectDataResponse);
      }
    );
  });

  describe.skip('Update application entity state - positive path - REJECT', () => {
    beforeAll(async () => {
      uniqueTextId = Math.random()
        .toString(12)
        .slice(-6);
      userName = `testUser${uniqueTextId}`;
      userFirstName = `userFirstName${uniqueTextId}`;
      userLastName = `userLastName${uniqueTextId}`;
      userPhone = `userPhone ${uniqueTextId}`;
      userEmail = `${uniqueTextId}@test.com`;
      challengeName = `testChallenge ${uniqueTextId}`;
      const ecoverseCommunityIds = await getCommunityData();
      ecoverseCommunityId =
        ecoverseCommunityIds.body.data.ecoverse.community.id;

      // Create user
      const responseCreateUser = await createUserDetailsMutation(
        userName,
        userFirstName,
        userLastName,
        userPhone,
        userEmail
      );
      userId = responseCreateUser.body.data.createUser.id;

      applicationData = await createApplicationMutation(
        ecoverseCommunityId,
        userId
      );
      applicationId = applicationData.body.data.createApplication.id;
    });

    // Arrange
    test.each`
      setEvent     | state         | nextEvents
      ${'REJECT'}  | ${'rejected'} | ${['REOPEN', 'ARCHIVE']}
      ${'REOPEN'}  | ${'new'}      | ${['APPROVE', 'REJECT']}
      ${'APPROVE'} | ${'approved'} | ${[]}
    `(
      'should update challenge, when set event: "$setEvent" to state: "$state", nextEvents: "$nextEvents"',
      async ({ setEvent, state, nextEvents }) => {
        // Act
        let updateState = await eventOnApplicationMutation(
          applicationId,
          setEvent
        );
        let data = updateState.body.data.eventOnApplication.lifecycle;
        const getApp = await getApplication(applicationId);
        let applicationDataResponse =
          getApp.body.data.ecoverse.application.lifecycle;

        // Assert
        expect(data.state).toEqual(state);
        expect(data.nextEvents).toEqual(nextEvents);
        expect(data).toEqual(applicationDataResponse);
      }
    );
  });
});
