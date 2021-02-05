import {
  graphqlRequest,
  graphqlRequestAuth,
} from '@test/utils/graphql.request';
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

const notAuthorizedCode = '"code":"UNAUTHENTICATED"';
const forbiddenCode = '"code":"FORBIDDEN"';

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
});

afterAll(async () => {
  if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
});

describe('DDT community admin user - queries - authorized', () => {
  // Arrange
  test.each`
    query                                 | expected
    ${name}                               | ${forbiddenCode}
    ${hostGroups}                         | ${forbiddenCode}
    ${hostMembers}                        | ${forbiddenCode}
    ${hostProfile}                        | ${forbiddenCode}
    ${contextTagline}                     | ${forbiddenCode}
    ${contextBackground}                  | ${forbiddenCode}
    ${contextVision}                      | ${forbiddenCode}
    ${contextWho}                         | ${forbiddenCode}
    ${contextImpact}                      | ${forbiddenCode}
    ${contextReferencesName}              | ${forbiddenCode}
    ${usersName}                          | ${forbiddenCode}
    ${usersAccountUPN}                    | ${forbiddenCode}
    ${usersProfile}                       | ${forbiddenCode}
    ${usersMemberofGroupsName}            | ${forbiddenCode}
    ${usersMemberofChallengesName}        | ${forbiddenCode}
    ${usersMemberofOrganisationsName}     | ${forbiddenCode}
    ${userName}                           | ${forbiddenCode}
    ${userAccountUPN}                     | ${forbiddenCode}
    ${userProfile}                        | ${forbiddenCode}
    ${userMemberofGroupsName}             | ${forbiddenCode}
    ${userMemberofChallengesName}         | ${forbiddenCode}
    ${userMemberofOrganisationsName}      | ${forbiddenCode}
    ${usersById}                          | ${forbiddenCode}
    ${groupsName}                         | ${forbiddenCode}
    ${groupsFocalPointName}               | ${forbiddenCode}
    ${groupsProfile}                      | ${forbiddenCode}
    ${groupsMembersName}                  | ${forbiddenCode}
    ${groupsParentChallenge}              | ${forbiddenCode}
    ${groupsParentEcoverse}               | ${forbiddenCode}
    ${groupsParentOpportunity}            | ${forbiddenCode}
    ${groupsWithTagName}                  | ${forbiddenCode}
    ${groupsWithTagFocalPointName}        | ${forbiddenCode}
    ${groupsWithTagProfile}               | ${forbiddenCode}
    ${groupsWithTagMembersName}           | ${forbiddenCode}
    ${groupsWithTagParentChallenge}       | ${forbiddenCode}
    ${groupsWithTagParentEcoverse}        | ${forbiddenCode}
    ${groupsWithTagParentOpportunity}     | ${forbiddenCode}
    ${challengesName}                     | ${forbiddenCode}
    ${challengesTextId}                   | ${forbiddenCode}
    ${challengesState}                    | ${forbiddenCode}
    ${challengesContext}                  | ${forbiddenCode}
    ${challengesLeadOrganisation}         | ${forbiddenCode}
    ${challengesLeadOrganisationGroups}   | ${forbiddenCode}
    ${challengesContributors}             | ${forbiddenCode}
    ${challengesTagsets}                  | ${forbiddenCode}
    ${challengesGroups}                   | ${forbiddenCode}
    ${challengesOpportunities}            | ${forbiddenCode}
    ${challengeName}                      | ${forbiddenCode}
    ${challengeTextId}                    | ${forbiddenCode}
    ${challengeState}                     | ${forbiddenCode}
    ${challengeContext}                   | ${forbiddenCode}
    ${challengeLeadOrganisation}          | ${forbiddenCode}
    ${challengeLeadOrganisationGroups}    | ${forbiddenCode}
    ${challengeContributors}              | ${forbiddenCode}
    ${challengeTagsets}                   | ${forbiddenCode}
    ${challengeGroups}                    | ${forbiddenCode}
    ${challengeOpportunities}             | ${forbiddenCode}
    ${opportunitiesName}                  | ${forbiddenCode}
    ${opportunitiesTextId}                | ${forbiddenCode}
    ${opportunitiesState}                 | ${forbiddenCode}
    ${opportunitiesContext}               | ${forbiddenCode}
    ${opportunitiesContributors}          | ${forbiddenCode}
    ${opportunitiesGroups}                | ${forbiddenCode}
    ${opportunitiesActorgroupsName}       | ${forbiddenCode}
    ${opportunitiesActorGroupsActorsName} | ${forbiddenCode}
    ${opportunitiesAspects}               | ${forbiddenCode}
    ${opportunitiesRelationsName}         | ${forbiddenCode}
    ${projectsName}                       | ${forbiddenCode}
    ${projectsTextId}                     | ${forbiddenCode}
    ${projectsDescription}                | ${forbiddenCode}
    ${projectsState}                      | ${forbiddenCode}
    ${projectsTagset}                     | ${forbiddenCode}
    ${projectsAspects}                    | ${forbiddenCode}
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
        TestUser.COMMUNITY_ADMIN
      );
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).not.toContain(expected);
    }
  );
});

// Failing scenarios BUG: https://app.zenhub.com/workspaces/cherrytwist-5ecb98b262ebd9f4aec4194c/issues/cherrytwist/server/578
// ${opportunitiesProjectsId}          | ${forbiddenCode}
// ${opportunitiesProjectsAspectsId}   | ${forbiddenCode}

describe('DDT community admin user - Create mutations - authorized', () => {
  // Arrange
  test.each`
    mutation                            | variables                            | expected
    ${createOrganisationMutation}       | ${createOrganisationVariables}       | ${forbiddenCode}
    ${createReferenceOnProfileMutation} | ${createReferenceOnProfileVariable}  | ${forbiddenCode}
    ${createReferenceOnContextMutation} | ${createReferenceOnContextVariables} | ${forbiddenCode}
    ${createTagsetOnProfileMutation}    | ${createTagsetOnProfileVariables}    | ${forbiddenCode}
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
        TestUser.COMMUNITY_ADMIN
      );
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).not.toContain(expected);
    }
  );
});

//  Scenario excluded not to load with fake data the AAD   ${createUserMutation}   | ${createUserVariables}  | ${forbiddenCode}

describe('DDT community admin user - Create mutations - NOT authorized', () => {
  // Arrange
  test.each`
    mutation                             | variables                             | expected
    ${createGroupOnEcoverseMutation}     | ${createGroupOnEcoverseVariables}     | ${forbiddenCode}
    ${createChallengeMutation}           | ${createChallengeVariables}           | ${forbiddenCode}
    ${createGroupOnChallengeMutation}    | ${createGroupOnChallengeVariables}    | ${forbiddenCode}
    ${createOpportunityMutation}         | ${createOpportunityVariables}         | ${forbiddenCode}
    ${createGroupOnOpportunityMutations} | ${createGroupOnOpportunityVariables}  | ${forbiddenCode}
    ${createProjectMutation}             | ${createProjectVariables}             | ${forbiddenCode}
    ${createActorGroupMutation}          | ${createActorGroupVariables}          | ${forbiddenCode}
    ${createActorMutation}               | ${createActorVariables}               | ${forbiddenCode}
    ${createAspectOnOpportunityMutation} | ${createAspectOnOpportunityVariables} | ${forbiddenCode}
    ${createRelationMutation}            | ${createRelationVariables}            | ${forbiddenCode}
    ${createAspectOnProjectMutation}     | ${createAspectOnProjectVariables}     | ${forbiddenCode}
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
        TestUser.COMMUNITY_ADMIN
      );
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toContain(expected);
    }
  );
});

describe('DDT community admin user - Update mutations - authorized', () => {
  // Arrange
  test.each`
    mutation                                  | variables                                  | expected
    ${updateUserMutation}                     | ${updateUserVariables}                     | ${forbiddenCode}
    ${updateProfileMutation}                  | ${updateProfileVariables}                  | ${forbiddenCode}
    ${updateOrganisationMutation}             | ${updateOrganisationVariabls}              | ${forbiddenCode}
    ${addTagsOnTagsetMutation}                | ${addTagsOnTagsetVariables}                | ${forbiddenCode}
    ${replaceTagsOnTagsetMutation}            | ${replaceTagsOnTagsetVariables}            | ${forbiddenCode}
    ${addUserToChallengeMutation}             | ${addUserToChallengeVariables}             | ${forbiddenCode}
    ${addUserToGroupMutation}                 | ${addUserToGroupVariables}                 | ${forbiddenCode}
    ${addUserToOpportunityMutation}           | ${addUserToOpportunityVariables}           | ${forbiddenCode}
    ${assignGroupFocalPointMutation}          | ${assignGroupFocalPointVariables}          | ${forbiddenCode}
    ${removeGroupFocalPointMutation}          | ${removeGroupFocalPointVariables}          | ${forbiddenCode}
    ${addChallengeLeadToOrganisationMutation} | ${addChallengeLeadToOrganisationVariables} | ${forbiddenCode}
    ${removeUserFromGroupMutation}            | ${removeUserFromGroupVariables}            | ${forbiddenCode}
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
        TestUser.COMMUNITY_ADMIN
      );
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).not.toContain(expected);
    }
  );
});

describe('DDT community admin user - Update mutations - NOT authorized', () => {
  // Arrange
  test.each`
    mutation                     | variables                     | expected
    ${updateChallengeMutation}   | ${updateChallengeVariables}   | ${forbiddenCode}
    ${updateOpportunityMutation} | ${updateOpportunityVariables} | ${forbiddenCode}
    ${updateAspectMutation}      | ${updateAspectVariable}       | ${forbiddenCode}
    ${updateActorMutation}       | ${updateActorVariables}       | ${forbiddenCode}
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
        TestUser.COMMUNITY_ADMIN
      );
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toContain(expected);
    }
  );
});

describe('DDT community admin user - Remove mutations - authorized', () => {
  // Arrange
  test.each`
    mutation              | variables              | expected
    ${removeUserMutation} | ${removeUserVariables} | ${forbiddenCode}
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
        TestUser.COMMUNITY_ADMIN
      );
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).not.toContain(expected);
    }
  );
});

describe('DDT community admin user - Remove mutations - NOT authorized', () => {
  // Arrange
  test.each`
    mutation                    | variables                    | expected
    ${removeChallengeMutation}  | ${removeChallengeVariables}  | ${forbiddenCode}
    ${removeAspectMutation}     | ${removeAspectVariables}     | ${forbiddenCode}
    ${removeActorGroupMutation} | ${removeActorGroupVariables} | ${forbiddenCode}
    ${removeActorMutation}      | ${removeActorVariables}      | ${forbiddenCode}
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
        TestUser.COMMUNITY_ADMIN
      );
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toContain(expected);
    }
  );
});
