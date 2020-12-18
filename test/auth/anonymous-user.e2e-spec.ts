import { graphqlRequest, graphqlRequestAuth } from '../utils/graphql.request';
import '../utils/array.matcher';
import { appSingleton } from '../utils/app.singleton';
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
} from '../utils/queries';

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
} from '../utils/create-mutations';

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
} from '../utils/update-mutations';

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
} from '../utils/remove-mutations';

const notAuthorizedCode = '"code":"UNAUTHENTICATED"';

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
});

afterAll(async () => {
  if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
});

describe('DDT anonymous user - queries - Not authorized', () => {
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
    ${challengesContributors}           | ${notAuthorizedCode}
    ${challengesGroups}                 | ${notAuthorizedCode}
    ${challengeLeadOrganisationGroups}  | ${notAuthorizedCode}
    ${challengeContributors}            | ${notAuthorizedCode}
    ${challengeGroups}                  | ${notAuthorizedCode}
    ${opportunitiesContributors}        | ${notAuthorizedCode}
    ${opportunitiesGroups}              | ${notAuthorizedCode}
    ${projectsName}                     | ${notAuthorizedCode}
    ${projectsTextId}                   | ${notAuthorizedCode}
    ${projectsDescription}              | ${notAuthorizedCode}
    ${projectsState}                    | ${notAuthorizedCode}
    ${projectsTagset}                   | ${notAuthorizedCode}
    ${projectsAspects}                  | ${notAuthorizedCode}
  `(
    "should expect: '$expected' for query: '$query'",
    async ({ query, expected }) => {
      // Act
      const requestParamsQueryData = {
        operationName: null,
        query: `${query}`,
        variables: null,
      };
      const response = await graphqlRequest(requestParamsQueryData);
      const responseData = JSON.stringify(response.body).replace('\\', '');
      //

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toContain(expected);
    }
  );
});

// Failing scenarios BUG: https://app.zenhub.com/workspaces/cherrytwist-5ecb98b262ebd9f4aec4194c/issues/cherrytwist/server/578
// ${opportunitiesProjectsId}          | ${notAuthorizedCode}
// ${opportunitiesProjectsAspectsId}   | ${notAuthorizedCode}

describe('DDT anonymous user - queries - authorized', () => {
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
    ${challengesLeadOrganisation}         | ${notAuthorizedCode}
    ${challengesTagsets}                  | ${notAuthorizedCode}
    ${challengesOpportunities}            | ${notAuthorizedCode}
    ${challengeName}                      | ${notAuthorizedCode}
    ${challengeTextId}                    | ${notAuthorizedCode}
    ${challengeState}                     | ${notAuthorizedCode}
    ${challengeContext}                   | ${notAuthorizedCode}
    ${challengeLeadOrganisation}          | ${notAuthorizedCode}
    ${challengeTagsets}                   | ${notAuthorizedCode}
    ${challengeOpportunities}             | ${notAuthorizedCode}
    ${opportunitiesName}                  | ${notAuthorizedCode}
    ${opportunitiesTextId}                | ${notAuthorizedCode}
    ${opportunitiesState}                 | ${notAuthorizedCode}
    ${opportunitiesContext}               | ${notAuthorizedCode}
    ${opportunitiesActorgroupsName}       | ${notAuthorizedCode}
    ${opportunitiesActorGroupsActorsName} | ${notAuthorizedCode}
    ${opportunitiesAspects}               | ${notAuthorizedCode}
    ${opportunitiesRelationsName}         | ${notAuthorizedCode}
  `(
    "should expect: '$expected' for query: '$query'",
    async ({ query, expected }) => {
      // Act
      const requestParamsQueryData = {
        operationName: null,
        query: `${query}`,
        variables: null,
      };
      const response = await graphqlRequest(requestParamsQueryData);
      const responseData = JSON.stringify(response.body).replace('\\', '');
      //

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).not.toContain(expected);
    }
  );
});

describe('DDT anonymous user - Create mutations - Not authorized', () => {
  // Arrange
  test.each`
    mutation                             | variables                             | expected
    ${createOrganisationMutation}        | ${createOrganisationVariables}        | ${notAuthorizedCode}
    ${createGroupOnEcoverseMutation}     | ${createGroupOnEcoverseVariables}     | ${notAuthorizedCode}
    ${createOrganisationMutation}        | ${createOrganisationVariables}        | ${notAuthorizedCode}
    ${createUserMutation}                | ${createUserVariables}                | ${notAuthorizedCode}
    ${createReferenceOnProfileMutation}  | ${createReferenceOnProfileVariable}   | ${notAuthorizedCode}
    ${createChallengeMutation}           | ${createChallengeVariables}           | ${notAuthorizedCode}
    ${createGroupOnChallengeMutation}    | ${createGroupOnChallengeVariables}    | ${notAuthorizedCode}
    ${createOpportunityMutation}         | ${createOpportunityVariables}         | ${notAuthorizedCode}
    ${createGroupOnOpportunityMutations} | ${createGroupOnOpportunityVariables}  | ${notAuthorizedCode}
    ${createProjectMutation}             | ${createProjectVariables}             | ${notAuthorizedCode}
    ${createActorGroupMutation}          | ${createActorGroupVariables}          | ${notAuthorizedCode}
    ${createActorMutation}               | ${createActorVariables}               | ${notAuthorizedCode}
    ${createAspectOnOpportunityMutation} | ${createAspectOnOpportunityVariables} | ${notAuthorizedCode}
    ${createRelationMutation}            | ${createRelationVariables}            | ${notAuthorizedCode}
    ${createAspectOnProjectMutation}     | ${createAspectOnProjectVariables}     | ${notAuthorizedCode}
    ${createReferenceOnContextMutation}  | ${createReferenceOnContextVariables}  | ${notAuthorizedCode}
    ${createTagsetOnProfileMutation}     | ${createTagsetOnProfileVariables}     | ${notAuthorizedCode}
  `(
    "should expect: '$expected' for create mutation: '$mutation' and variables: '$variables'",
    async ({ mutation, variables, expected }) => {
      // Act
      const requestParamsCreateMutations = {
        operationName: null,
        query: `${mutation}`,
        variables: `${variables}`,
      };
      const response = await graphqlRequest(requestParamsCreateMutations);
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toContain(expected);
    }
  );
});

describe('DDT anonymous user - Update mutations - NOT authorized', () => {
  // Arrange
  test.each`
    mutation                                  | variables                                  | expected
    ${updateUserMutation}                     | ${updateUserVariables}                     | ${notAuthorizedCode}
    ${updateProfileMutation}                  | ${updateProfileVariables}                  | ${notAuthorizedCode}
    ${updateOrganisationMutation}             | ${updateOrganisationVariabls}              | ${notAuthorizedCode}
    ${updateChallengeMutation}                | ${updateChallengeVariables}                | ${notAuthorizedCode}
    ${updateOpportunityMutation}              | ${updateOpportunityVariables}              | ${notAuthorizedCode}
    ${updateAspectMutation}                   | ${updateAspectVariable}                    | ${notAuthorizedCode}
    ${updateActorMutation}                    | ${updateActorVariables}                    | ${notAuthorizedCode}
    ${addTagsOnTagsetMutation}                | ${addTagsOnTagsetVariables}                | ${notAuthorizedCode}
    ${replaceTagsOnTagsetMutation}            | ${replaceTagsOnTagsetVariables}            | ${notAuthorizedCode}
    ${addUserToChallengeMutation}             | ${addUserToChallengeVariables}             | ${notAuthorizedCode}
    ${addUserToGroupMutation}                 | ${addUserToGroupVariables}                 | ${notAuthorizedCode}
    ${addUserToOpportunityMutation}           | ${addUserToOpportunityVariables}           | ${notAuthorizedCode}
    ${assignGroupFocalPointMutation}          | ${assignGroupFocalPointVariables}          | ${notAuthorizedCode}
    ${removeGroupFocalPointMutation}          | ${removeGroupFocalPointVariables}          | ${notAuthorizedCode}
    ${addChallengeLeadToOrganisationMutation} | ${addChallengeLeadToOrganisationVariables} | ${notAuthorizedCode}
    ${removeUserFromGroupMutation}            | ${removeUserFromGroupVariables}            | ${notAuthorizedCode}
  `(
    "should expect: '$expected' for update mutation: '$mutation' and variables: '$variables'",
    async ({ mutation, variables, expected }) => {
      // Act
      const requestParamsUpdateMutations = {
        operationName: null,
        query: `${mutation}`,
        variables: `${variables}`,
      };
      const response = await graphqlRequest(requestParamsUpdateMutations);
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toContain(expected);
    }
  );
});

describe('DDT anonymous user - Remove mutations - NOT authorized', () => {
  // Arrange
  test.each`
    mutation                    | variables                    | expected
    ${removeUserMutation}       | ${removeUserVariables}       | ${notAuthorizedCode}
    ${removeChallengeMutation}  | ${removeChallengeVariables}  | ${notAuthorizedCode}
    ${removeAspectMutation}     | ${removeAspectVariables}     | ${notAuthorizedCode}
    ${removeActorMutation}      | ${removeActorVariables}      | ${notAuthorizedCode}
    ${removeActorGroupMutation} | ${removeActorGroupVariables} | ${notAuthorizedCode}
  `(
    "should expect: '$expected' for remove mutation: '$mutation' and variables: '$variables'",
    async ({ mutation, variables, expected }) => {
      // Act
      const requestParamsRemoveMutations = {
        operationName: null,
        query: `${mutation}`,
        variables: `${variables}`,
      };
      const response = await graphqlRequest(requestParamsRemoveMutations);
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toContain(expected);
    }
  );
});
