import { graphqlRequest, graphqlRequestAuth } from '@test/utils/graphql.request';
import { TestUser } from '@test/utils/token.helper';
import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';
import {
  name,
  hostMembers,
  hostGroups,
  hostProfile,
  contextTagline,
  contextBackground,
  contextVision,
  contextImpact,
  contextWho,
  contextReferencesName,
  usersName,
  usersAccountUPN,
  usersProfile,
  usersMemberofGroupsName,
  usersMemberofChallengesName,
  usersMemberofOrganisationsName,
  userName,
  userAccountUPN,
  userProfile,
  userMemberofGroupsName,
  userMemberofChallengesName,
  userMemberofOrganisationsName,
  usersById,
  groupsName,
  groupsFocalPointName,
  groupsProfile,
  groupsMembersName,
  groupsParentChallenge,
  groupsParentEcoverse,
  groupsParentOpportunity,
  groupsWithTagName,
  groupsWithTagFocalPointName,
  groupsWithTagProfile,
  groupsWithTagMembersName,
  groupsWithTagParentChallenge,
  groupsWithTagParentEcoverse,
  groupsWithTagParentOpportunity,
  challengesName,
  challengesTextId,
  challengesState,
  challengesContext,
  challengesLeadOrganisation,
  challengesLeadOrganisationGroups,
  challengesContributors,
  challengesTagsets,
  challengesGroups,
  challengesOpportunities,
  challengeName,
  challengeTextId,
  challengeState,
  challengeContext,
  challengeLeadOrganisation,
  challengeLeadOrganisationGroups,
  challengeTagsets,
  challengeGroups,
  challengeContributors,
  challengeOpportunities,
  opportunitiesName,
  opportunitiesTextId,
  opportunitiesState,
  opportunitiesContext,
  opportunitiesGroups,
  opportunitiesContributors,
  opportunitiesProjectsName,
  opportunitiesProjectsAspectsName,
  opportunitiesActorgroupsName,
  opportunitiesActorGroupsActorsName,
  opportunitiesAspects,
  opportunitiesRelationsName,
  projectsName,
  projectsTextId,
  projectsDescription,
  projectsState,
  projectsTagset,
  projectsAspects,
} from '@test/utils/queries';

import {
  createOrganisationMutation,
  createOrganisationVariables,
  createGroupOnEcoverseMutation,
  createGroupOnEcoverseVariables,
  createUserMutation,
  createUserVariables,
  createReferenceOnProfileMutation,
  createReferenceOnProfileVariable,
  createChallengeMutation,
  createChallengeVariables,
  createGroupOnChallengeMutation,
  createGroupOnChallengeVariables,
  createOpportunityMutation,
  createOpportunityVariables,
  createGroupOnOpportunityMutations,
  createGroupOnOpportunityVariables,
  createProjectMutation,
  createProjectVariables,
  createActorGroupMutation,
  createActorGroupVariables,
  createActorMutation,
  createActorVariables,
  createAspectOnOpportunityMutation,
  createAspectOnOpportunityVariables,
  createRelationMutation,
  createRelationVariables,
  createAspectOnProjectMutation,
  createAspectOnProjectVariables,
  createReferenceOnContextMutation,
  createReferenceOnContextVariables,
  createTagsetOnProfileMutation,
  createTagsetOnProfileVariables,
} from '@test/utils/create-mutations';

import {
  updateUserMutation,
  updateUserVariables,
  updateProfileMutation,
  updateProfileVariables,
  updateOrganisationMutation,
  updateOrganisationVariabls,
  updateChallengeMutation,
  updateChallengeVariables,
  updateOpportunityMutation,
  updateOpportunityVariables,
  updateAspectMutation,
  updateAspectVariable,
  updateActorMutation,
  updateActorVariables,
  addTagsOnTagsetMutation,
  addTagsOnTagsetVariables,
  replaceTagsOnTagsetMutation,
  replaceTagsOnTagsetVariables,
  addUserToChallengeMutation,
  addUserToChallengeVariables,
  addUserToGroupMutation,
  addUserToGroupVariables,
  addUserToOpportunityMutation,
  addUserToOpportunityVariables,
  assignGroupFocalPointMutation,
  assignGroupFocalPointVariables,
  removeGroupFocalPointMutation,
  removeGroupFocalPointVariables,
  addChallengeLeadToOrganisationMutation,
  addChallengeLeadToOrganisationVariables,
  removeUserFromGroupMutation,
  removeUserFromGroupVariables,
} from '@test/utils/update-mutations';

import {
  removeUserMutation,
  removeUserVariables,
  removeChallengeMutation,
  removeChallengeVariables,
  removeAspectMutation,
  removeAspectVariables,
  removeActorMutation,
  removeActorVariables,
  removeActorGroupMutation,
  removeActorGroupVariables,
} from '@test/utils/remove-mutations';

const notAuthorizedCode = '"code":"FORBIDDEN"';

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
});

afterAll(async () => {
  if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
});

describe('DDT ecoverse member user - queries - authorized', () => {
  // Arrange
  test.each`
    query                                 | expected
    ${name}                               | ${notAuthorizedCode}
    ${hostProfile}                        | ${notAuthorizedCode}
    ${contextTagline}                     | ${notAuthorizedCode}
    ${contextBackground}                  | ${notAuthorizedCode}
    ${contextVision}                      | ${notAuthorizedCode}
    ${contextWho}                         | ${notAuthorizedCode}
    ${contextImpact}                      | ${notAuthorizedCode}
    ${contextReferencesName}              | ${notAuthorizedCode}
    ${challengesName}                     | ${notAuthorizedCode}
    ${challengesTextId}                   | ${notAuthorizedCode}
    ${challengesState}                    | ${notAuthorizedCode}
    ${challengesContext}                  | ${notAuthorizedCode}
    ${challengesContributors}             | ${notAuthorizedCode}
    ${challengesTagsets}                  | ${notAuthorizedCode}
    ${challengesGroups}                   | ${notAuthorizedCode}
    ${challengesOpportunities}            | ${notAuthorizedCode}
    ${challengesLeadOrganisation}         | ${notAuthorizedCode}
    ${challengeName}                      | ${notAuthorizedCode}
    ${challengeTextId}                    | ${notAuthorizedCode}
    ${challengeState}                     | ${notAuthorizedCode}
    ${challengeContext}                   | ${notAuthorizedCode}
    ${challengeContributors}              | ${notAuthorizedCode}
    ${challengeTagsets}                   | ${notAuthorizedCode}
    ${challengeGroups}                    | ${notAuthorizedCode}
    ${challengeOpportunities}             | ${notAuthorizedCode}
    ${challengeLeadOrganisation}          | ${notAuthorizedCode}
    ${opportunitiesName}                  | ${notAuthorizedCode}
    ${opportunitiesTextId}                | ${notAuthorizedCode}
    ${opportunitiesState}                 | ${notAuthorizedCode}
    ${opportunitiesContext}               | ${notAuthorizedCode}
    ${opportunitiesContributors}          | ${notAuthorizedCode}
    ${opportunitiesGroups}                | ${notAuthorizedCode}
    ${opportunitiesActorgroupsName}       | ${notAuthorizedCode}
    ${opportunitiesActorGroupsActorsName} | ${notAuthorizedCode}
    ${opportunitiesAspects}               | ${notAuthorizedCode}
    ${opportunitiesRelationsName}         | ${notAuthorizedCode}
    ${projectsName}                       | ${notAuthorizedCode}
    ${projectsTextId}                     | ${notAuthorizedCode}
    ${projectsDescription}                | ${notAuthorizedCode}
    ${projectsState}                      | ${notAuthorizedCode}
    ${projectsTagset}                     | ${notAuthorizedCode}
    ${projectsAspects}                    | ${notAuthorizedCode}
  `(
    'should expect: \'$expected\' for query: \'$query\'',
    async ({ query, expected }) => {
      // Act
      const requestParamsQueryData = {
        operationName: null,
        query: `${query}`,
        variables: null,
      };
      const response = await graphqlRequestAuth(
        requestParamsQueryData,
        TestUser.ECOVERSE_MEMBER
      );
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).not.toContain(expected);
    }
  );
});

// Failing scenarios BUG: https://app.zenhub.com/workspaces/cherrytwist-5ecb98b262ebd9f4aec4194c/issues/cherrytwist/server/578
// ${opportunitiesProjectsId}          | ${notAuthorizedCode}
// ${opportunitiesProjectsAspectsId}   | ${notAuthorizedCode}

describe('DDT ecoverse member user - queries - NOT authorized', () => {
  // Arrange
  test.each`
    query                               | expected
    ${hostGroups}                       | ${notAuthorizedCode}
    ${hostMembers}                      | ${notAuthorizedCode}
    ${usersName}                        | ${notAuthorizedCode}
    ${usersAccountUPN}                  | ${notAuthorizedCode}
    ${usersProfile}                     | ${notAuthorizedCode}
    ${usersMemberofGroupsName}          | ${notAuthorizedCode}
    ${usersMemberofChallengesName}      | ${notAuthorizedCode}
    ${usersMemberofOrganisationsName}   | ${notAuthorizedCode}
    ${userName}                         | ${notAuthorizedCode}
    ${userAccountUPN}                   | ${notAuthorizedCode}
    ${userProfile}                      | ${notAuthorizedCode}
    ${userMemberofGroupsName}           | ${notAuthorizedCode}
    ${userMemberofChallengesName}       | ${notAuthorizedCode}
    ${userMemberofOrganisationsName}    | ${notAuthorizedCode}
    ${usersById}                        | ${notAuthorizedCode}
    ${groupsName}                       | ${notAuthorizedCode}
    ${groupsFocalPointName}             | ${notAuthorizedCode}
    ${groupsProfile}                    | ${notAuthorizedCode}
    ${groupsMembersName}                | ${notAuthorizedCode}
    ${groupsParentChallenge}            | ${notAuthorizedCode}
    ${groupsParentEcoverse}             | ${notAuthorizedCode}
    ${groupsParentOpportunity}          | ${notAuthorizedCode}
    ${groupsWithTagName}                | ${notAuthorizedCode}
    ${groupsWithTagFocalPointName}      | ${notAuthorizedCode}
    ${groupsWithTagProfile}             | ${notAuthorizedCode}
    ${groupsWithTagMembersName}         | ${notAuthorizedCode}
    ${groupsWithTagParentChallenge}     | ${notAuthorizedCode}
    ${groupsWithTagParentEcoverse}      | ${notAuthorizedCode}
    ${groupsWithTagParentOpportunity}   | ${notAuthorizedCode}
    ${challengesLeadOrganisationGroups} | ${notAuthorizedCode}
    ${challengeLeadOrganisationGroups}  | ${notAuthorizedCode}
  `(
    'should expect: \'$expected\' for query: \'$query\'',
    async ({ query, expected }) => {
      // Act
      const requestParamsQueryData = {
        operationName: null,
        query: `${query}`,
        variables: null,
      };
      const response = await graphqlRequestAuth(
        requestParamsQueryData,
        TestUser.ECOVERSE_MEMBER
      );
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toContain(expected);
    }
  );
});

// skipping the test due to requirenments clarifications
describe.skip('DDT ecoverse member user - Create mutations - authorized', () => {
  // Arrange
  test.each`
    mutation                  | variables                  | expected
    ${createRelationMutation} | ${createRelationVariables} | ${notAuthorizedCode}
  `(
    'should expect: \'$expected\' for create mutation: \'$mutation\' and variables: \'$variables\'',
    async ({ mutation, variables, expected }) => {
      // Act
      const requestParamsCreateMutations = {
        operationName: null,
        query: `${mutation}`,
        variables: `${variables}`,
      };
      const response = await graphqlRequestAuth(
        requestParamsCreateMutations,
        TestUser.ECOVERSE_MEMBER
      );
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).not.toContain(expected);
    }
  );
});

describe('DDT ecoverse member user - Create mutations - NOT authorized', () => {
  // Arrange
  test.each`
    mutation                             | variables                             | expected
    ${createOrganisationMutation}        | ${createOrganisationVariables}        | ${notAuthorizedCode}
    ${createReferenceOnProfileMutation}  | ${createReferenceOnProfileVariable}   | ${notAuthorizedCode}
    ${createReferenceOnContextMutation}  | ${createReferenceOnContextVariables}  | ${notAuthorizedCode}
    ${createTagsetOnProfileMutation}     | ${createTagsetOnProfileVariables}     | ${notAuthorizedCode}
    ${createGroupOnEcoverseMutation}     | ${createGroupOnEcoverseVariables}     | ${notAuthorizedCode}
    ${createChallengeMutation}           | ${createChallengeVariables}           | ${notAuthorizedCode}
    ${createGroupOnChallengeMutation}    | ${createGroupOnChallengeVariables}    | ${notAuthorizedCode}
    ${createOpportunityMutation}         | ${createOpportunityVariables}         | ${notAuthorizedCode}
    ${createGroupOnOpportunityMutations} | ${createGroupOnOpportunityVariables}  | ${notAuthorizedCode}
    ${createProjectMutation}             | ${createProjectVariables}             | ${notAuthorizedCode}
    ${createActorGroupMutation}          | ${createActorGroupVariables}          | ${notAuthorizedCode}
    ${createActorMutation}               | ${createActorVariables}               | ${notAuthorizedCode}
    ${createAspectOnOpportunityMutation} | ${createAspectOnOpportunityVariables} | ${notAuthorizedCode}
    ${createAspectOnProjectMutation}     | ${createAspectOnProjectVariables}     | ${notAuthorizedCode}
  `(
    'should expect: \'$expected\' for create mutation: \'$mutation\' and variables: \'$variables\'',
    async ({ mutation, variables, expected }) => {
      // Act
      const requestParamsCreateMutations = {
        operationName: null,
        query: `${mutation}`,
        variables: `${variables}`,
      };
      const response = await graphqlRequestAuth(
        requestParamsCreateMutations,
        TestUser.ECOVERSE_MEMBER
      );
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toContain(expected);
    }
  );
});

//  Scenario excluded not to load with fake data the AAD   ${createUserMutation}   | ${createUserVariables}  | ${notAuthorizedCode}

// Skipping the scanario: ${updateProfileMutation}| ${updateProfileVariables}| ${notAuthorizedCode} due to the following bugs:
// https://app.zenhub.com/workspaces/cherrytwist-5ecb98b262ebd9f4aec4194c/issues/cherrytwist/server/646
// https://app.zenhub.com/workspaces/cherrytwist-5ecb98b262ebd9f4aec4194c/issues/cherrytwist/server/647
describe('DDT ecoverse member user - Update mutations - NOT authorized', () => {
  // Arrange
  test.each`
    mutation                                  | variables                                  | expected
    ${updateUserMutation}                     | ${updateUserVariables}                     | ${notAuthorizedCode}
    ${updateOrganisationMutation}             | ${updateOrganisationVariabls}              | ${notAuthorizedCode}
    ${addTagsOnTagsetMutation}                | ${addTagsOnTagsetVariables}                | ${notAuthorizedCode}
    ${replaceTagsOnTagsetMutation}            | ${replaceTagsOnTagsetVariables}            | ${notAuthorizedCode}
    ${addUserToChallengeMutation}             | ${addUserToChallengeVariables}             | ${notAuthorizedCode}
    ${addUserToGroupMutation}                 | ${addUserToGroupVariables}                 | ${notAuthorizedCode}
    ${addUserToOpportunityMutation}           | ${addUserToOpportunityVariables}           | ${notAuthorizedCode}
    ${assignGroupFocalPointMutation}          | ${assignGroupFocalPointVariables}          | ${notAuthorizedCode}
    ${removeGroupFocalPointMutation}          | ${removeGroupFocalPointVariables}          | ${notAuthorizedCode}
    ${addChallengeLeadToOrganisationMutation} | ${addChallengeLeadToOrganisationVariables} | ${notAuthorizedCode}
    ${removeUserFromGroupMutation}            | ${removeUserFromGroupVariables}            | ${notAuthorizedCode}
    ${updateChallengeMutation}                | ${updateChallengeVariables}                | ${notAuthorizedCode}
    ${updateOpportunityMutation}              | ${updateOpportunityVariables}              | ${notAuthorizedCode}
    ${updateAspectMutation}                   | ${updateAspectVariable}                    | ${notAuthorizedCode}
    ${updateActorMutation}                    | ${updateActorVariables}                    | ${notAuthorizedCode}
  `(
    'should expect: \'$expected\' for update mutation: \'$mutation\' and variables: \'$variables\'',
    async ({ mutation, variables, expected }) => {
      // Act
      const requestParamsUpdateMutations = {
        operationName: null,
        query: `${mutation}`,
        variables: `${variables}`,
      };
      const response = await graphqlRequestAuth(
        requestParamsUpdateMutations,
        TestUser.ECOVERSE_MEMBER
      );
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toContain(expected);
    }
  );
});

describe('DDT ecoverse member user - Remove mutations - NOT authorized', () => {
  // Arrange
  test.each`
    mutation                    | variables                    | expected
    ${removeActorGroupMutation} | ${removeActorGroupVariables} | ${notAuthorizedCode}
    ${removeActorMutation}      | ${removeActorVariables}      | ${notAuthorizedCode}
    ${removeAspectMutation}     | ${removeAspectVariables}     | ${notAuthorizedCode}
    ${removeChallengeMutation}  | ${removeChallengeVariables}  | ${notAuthorizedCode}
    ${removeUserMutation}       | ${removeUserVariables}       | ${notAuthorizedCode}
  `(
    'should expect: \'$expected\' for remove mutation: \'$mutation\' and variables: \'$variables\'',
    async ({ mutation, variables, expected }) => {
      // Act
      const requestParamsRemoveMutations = {
        operationName: null,
        query: `${mutation}`,
        variables: `${variables}`,
      };
      const response = await graphqlRequestAuth(
        requestParamsRemoveMutations,
        TestUser.ECOVERSE_MEMBER
      );
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toContain(expected);
    }
  );
});
