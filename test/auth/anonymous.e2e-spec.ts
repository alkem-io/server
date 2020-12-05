import { graphqlRequestAuth } from '../utils/graphql.request';
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
  contextReferencesId,
  usersId,
  usersAccountUPN,
  usersProfileId,
  usersMemberofGroupsId,
  usersMemberofChallengesId,
  usersMemberofOrganisationsId,
  userId,
  userAccountUPN,
  userProfileId,
  userMemberofGroupsId,
  userMemberofChallengesId,
  userMemberofOrganisationsId,
  usersById,
  groupsId,
  groupsFocalPointId,
  groupsProfileId,
  groupsMembersId,
  groupsParentChallenge,
  groupsParentEcoverse,
  groupsParentOpportunity,
  groupsWithTagId,
  groupsWithTagFocalPointId,
  groupsWithTagProfileId,
  groupsWithTagMembersId,
  groupsWithTagParentChallenge,
  groupsWithTagParentEcoverse,
  groupsWithTagParentOpportunity,
  challengesId,
  challengesTextId,
  challengesState,
  challengesContexId,
  challengesLeadOrganisation,
  challengesLeadOrganisationGroups,
  challengesContributors,
  challengesTagsets,
  challengesGroups,
  challengesOpportunities,
  challengeId,
  challengeTextId,
  challengeState,
  challengeContexId,
  challengeLeadOrganisation,
  challengeLeadOrganisationGroups,
  challengeTagsets,
  challengeGroups,
  challengeContributors,
  challengeOpportunities,
  opportunitiesId,
  opportunitiesTextId,
  opportunitiesState,
  opportunitiesContexId,
  opportunitiesGroups,
  opportunitiesContributors,
  opportunitiesProjectsId,
  opportunitiesProjectsAspectsId,
  opportunitiesActorGroupsId,
  opportunitiesActorGroupsActorsId,
  opportunitiesAspectsId,
  opportunitiesRelationsId,
  projectsId,
  projectsTextId,
  projectsDescription,
  projectsState,
  projectsTagset,
  projectsAspects,
  templatesId,
  templatesDescription,
  templatesUsersId,
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
  createTemplateMutation,
  createTemplateVariables,
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

let profileId = '6';

const notAuthorizedCode = `"code":"UNAUTHENTICATED"`;

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
});

afterAll(async () => {
  if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
});

describe('DDT anonymous user - queries', () => {
  // Arrange
  test.each`
    query                               | expected
    ${name}                             | ${`{"data":{"name":"Cherrytwist"}}`}
    ${hostGroups}                       | ${notAuthorizedCode}
    ${hostMembers}                      | ${notAuthorizedCode}
    ${hostProfile}                      | ${`{"data":{"host":{"profile":{"id":"${profileId}"}}}}`}
    ${contextTagline}                   | ${`{"data":{"context":{"tagline":"Open`}
    ${contextBackground}                | ${`{"data":{"context":{"background":"The`}
    ${contextVision}                    | ${`{"data":{"context":{"vision":"The`}
    ${contextWho}                       | ${`{"data":{"context":{"who":"Everyone."}}}`}
    ${contextImpact}                    | ${`{"data":{"context":{"impact":"A`}
    ${contextReferencesId}              | ${`{"data":{"context":{"references":[{"id":"2"}`}
    ${usersId}                          | ${notAuthorizedCode}
    ${usersAccountUPN}                  | ${notAuthorizedCode}
    ${usersProfileId}                   | ${notAuthorizedCode}
    ${usersMemberofGroupsId}            | ${notAuthorizedCode}
    ${usersMemberofChallengesId}        | ${notAuthorizedCode}
    ${usersMemberofOrganisationsId}     | ${notAuthorizedCode}
    ${userId}                           | ${notAuthorizedCode}
    ${userAccountUPN}                   | ${notAuthorizedCode}
    ${userProfileId}                    | ${notAuthorizedCode}
    ${userMemberofGroupsId}             | ${notAuthorizedCode}
    ${userMemberofChallengesId}         | ${notAuthorizedCode}
    ${userMemberofOrganisationsId}      | ${notAuthorizedCode}
    ${usersById}                        | ${notAuthorizedCode}
    ${groupsId}                         | ${notAuthorizedCode}
    ${groupsFocalPointId}               | ${notAuthorizedCode}
    ${groupsProfileId}                  | ${notAuthorizedCode}
    ${groupsMembersId}                  | ${notAuthorizedCode}
    ${groupsParentChallenge}            | ${notAuthorizedCode}
    ${groupsParentEcoverse}             | ${notAuthorizedCode}
    ${groupsParentOpportunity}          | ${notAuthorizedCode}
    ${groupsWithTagId}                  | ${notAuthorizedCode}
    ${groupsWithTagFocalPointId}        | ${notAuthorizedCode}
    ${groupsWithTagProfileId}           | ${notAuthorizedCode}
    ${groupsWithTagMembersId}           | ${notAuthorizedCode}
    ${groupsWithTagParentChallenge}     | ${notAuthorizedCode}
    ${groupsWithTagParentEcoverse}      | ${notAuthorizedCode}
    ${groupsWithTagParentOpportunity}   | ${notAuthorizedCode}
    ${challengesId}                     | ${`{"data":{"challenges":[{"id":"1"}`}
    ${challengesTextId}                 | ${`{"data":{"challenges":[{"textID":"balance`}
    ${challengesState}                  | ${`{"data":{"challenges":[{"state":"Defined`}
    ${challengesContexId}               | ${`{"data":{"challenges":[{"context":{"id":"2"}`}
    ${challengesLeadOrganisation}       | ${`{"data":{"challenges":[{"leadOrganisations":[{"id":"1"}`}
    ${challengesLeadOrganisationGroups} | ${notAuthorizedCode}
    ${challengesContributors}           | ${notAuthorizedCode}
    ${challengesTagsets}                | ${`{"data":{"challenges":[{"tagset":{"id":"2`}
    ${challengesGroups}                 | ${notAuthorizedCode}
    ${challengesOpportunities}          | ${`{"data":{"challenges":[{"opportunities":[{"id":"2"}`}
    ${challengeId}                      | ${`{"data":{"challenge":{"id":"1"}`}
    ${challengeTextId}                  | ${`{"data":{"challenge":{"textID":"balance`}
    ${challengeState}                   | ${`{"data":{"challenge":{"state":"Defined`}
    ${challengeContexId}                | ${`{"data":{"challenge":{"context":{"id":"2"}`}
    ${challengeLeadOrganisation}        | ${`{"data":{"challenge":{"leadOrganisations":[{"id":"1"}`}
    ${challengeLeadOrganisationGroups}  | ${notAuthorizedCode}
    ${challengeContributors}            | ${notAuthorizedCode}
    ${challengeTagsets}                 | ${`{"data":{"challenge":{"tagset":{"id":"2`}
    ${challengeGroups}                  | ${notAuthorizedCode}
    ${challengeOpportunities}           | ${`{"data":{"challenge":{"opportunities":[{"id":"2"}`}
    ${opportunitiesId}                  | ${`{"data":{"opportunities":[{"id":"1"}`}
    ${opportunitiesTextId}              | ${`{"data":{"opportunities":[{"textID":"team`}
    ${opportunitiesState}               | ${`{"data":{"opportunities":[{"state":""`}
    ${opportunitiesContexId}            | ${`{"data":{"opportunities":[{"context":{"id":"22"}`}
    ${opportunitiesContributors}        | ${notAuthorizedCode}
    ${opportunitiesGroups}              | ${notAuthorizedCode}
    ${opportunitiesActorGroupsId}       | ${`{"data":{"opportunities":[{"actorGroups":[{"id":"1`}
    ${opportunitiesActorGroupsActorsId} | ${`{"data":{"opportunities":[{"actorGroups":[{"actors":[]},{"actors":[{"id":"1"}`}
    ${opportunitiesAspectsId}           | ${`{"data":{"opportunities":[{"aspects":[{"id":"1`}
    ${opportunitiesRelationsId}         | ${`{"data":{"opportunities":[{"relations":[{"id":"1"}`}
    ${projectsId}                       | ${notAuthorizedCode}
    ${projectsTextId}                   | ${notAuthorizedCode}
    ${projectsDescription}              | ${notAuthorizedCode}
    ${projectsState}                    | ${notAuthorizedCode}
    ${projectsTagset}                   | ${notAuthorizedCode}
    ${projectsAspects}                  | ${notAuthorizedCode}
    ${templatesId}                      | ${`{"data":{"templates":[{"id":"1"}`}
    ${templatesDescription}             | ${`{"data":{"templates":[{"description":"Default template"}`}
  `(
    "should expect: '$expected' for query: '$query'",
    async ({ query, expected }) => {
      // Act
      const requestParamsQueryData = {
        operationName: null,
        query: `${query}`,
        variables: null,
      };
      const response = await graphqlRequestAuth(requestParamsQueryData);
      let responseData = JSON.stringify(response.body).replace('\\', '');
      // console.log(responseData);

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toContain(expected);
    }
  );
});

// Failing scenarios BUG: https://app.zenhub.com/workspaces/cherrytwist-5ecb98b262ebd9f4aec4194c/issues/cherrytwist/server/578
// ${opportunitiesProjectsId}          | ${notAuthorizedCode}
// ${opportunitiesProjectsAspectsId}   | ${notAuthorizedCode}

describe('DDT anonymous user - create mutations', () => {
  // Arrange
  test.each`
    mutation                             | variables                             | expected
    ${createOrganisationMutation}        | ${createOrganisationVariables}        | ${notAuthorizedCode}
    ${createGroupOnEcoverseMutation}     | ${createGroupOnEcoverseVariables}     | ${notAuthorizedCode}
    ${createOrganisationMutation}        | ${createOrganisationVariables}        | ${notAuthorizedCode}
    ${createUserMutation}                | ${createUserVariables}                | ${notAuthorizedCode}
    ${createReferenceOnProfileMutation}  | ${createReferenceOnProfileVariable}   | ${notAuthorizedCode}
    ${createTemplateMutation}            | ${createTemplateVariables}            | ${notAuthorizedCode}
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
      const response = await graphqlRequestAuth(requestParamsCreateMutations);
      let responseData = JSON.stringify(response.body).replace('\\', '');
      console.log(responseData);

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toContain(expected);
    }
  );
});

describe('DDT anonymous user - update mutations', () => {
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
      const response = await graphqlRequestAuth(requestParamsUpdateMutations);
      let responseData = JSON.stringify(response.body).replace('\\', '');
      console.log(responseData);

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toContain(expected);
    }
  );
});

describe.only('DDT anonymous user - remove mutations', () => {
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
      const response = await graphqlRequestAuth(requestParamsRemoveMutations);
      let responseData = JSON.stringify(response.body).replace('\\', '');
      console.log(responseData);

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toContain(expected);
    }
  );
});
