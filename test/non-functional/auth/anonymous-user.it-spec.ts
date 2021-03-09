import { graphqlRequest } from '@test/utils/graphql.request';
import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';
import { getQueries } from '@test/non-functional/auth/queries';

import {
  getCreateMutation,
  getCreateVariables,
} from '@test/non-functional/auth/create-mutations';

import {
  getUpdateVariables,
  getUpdateMutation,
} from '@test/non-functional/auth/update-mutations';

import {
  getRemoveMutation,
  getRemoveVariables,
} from '@test/non-functional/auth/remove-mutations';

import { TestDataServiceInitResult } from '@src/services/data-management/test-data.service';

const notAuthorizedCode = '"code":"UNAUTHENTICATED"';
let data: TestDataServiceInitResult;

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
  data = appSingleton.Instance.getData();
});

afterAll(async () => {
  if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
});

describe('DDT anonymous user - queries - Not authorized', () => {
  // Arrange
  test.each`
    query                               | idName           | expected
    ${'hostGroups'}                     | ${''}            | ${notAuthorizedCode}
    ${'hostMembers'}                    | ${''}            | ${notAuthorizedCode}
    ${'usersName'}                      | ${''}            | ${notAuthorizedCode}
    ${'usersAccountUPN'}                | ${''}            | ${notAuthorizedCode}
    ${'usersProfile'}                   | ${''}            | ${notAuthorizedCode}
    ${'usersMemberofGroupsName'}        | ${''}            | ${notAuthorizedCode}
    ${'usersMemberofChallengesName'}    | ${''}            | ${notAuthorizedCode}
    ${'usersMemberofOrganisationsName'} | ${''}            | ${notAuthorizedCode}
    ${'userName'}                       | ${'userId'}      | ${notAuthorizedCode}
    ${'userAccountUPN'}                 | ${'userId'}      | ${notAuthorizedCode}
    ${'userProfile'}                    | ${'userId'}      | ${notAuthorizedCode}
    ${'userMemberofGroupsName'}         | ${'userId'}      | ${notAuthorizedCode}
    ${'userMemberofChallengesName'}     | ${'userId'}      | ${notAuthorizedCode}
    ${'userMemberofOrganisationsName'}  | ${'userId'}      | ${notAuthorizedCode}
    ${'usersById'}                      | ${''}            | ${notAuthorizedCode}
    ${'groupsName'}                     | ${''}            | ${notAuthorizedCode}
    ${'groupsFocalPointName'}           | ${''}            | ${notAuthorizedCode}
    ${'groupsProfile'}                  | ${''}            | ${notAuthorizedCode}
    ${'groupsMembersName'}              | ${''}            | ${notAuthorizedCode}
    ${'groupsParentChallenge'}          | ${''}            | ${notAuthorizedCode}
    ${'groupsParentEcoverse'}           | ${''}            | ${notAuthorizedCode}
    ${'groupsParentOpportunity'}        | ${''}            | ${notAuthorizedCode}
    ${'groupsWithTagName'}              | ${''}            | ${notAuthorizedCode}
    ${'groupsWithTagFocalPointName'}    | ${''}            | ${notAuthorizedCode}
    ${'groupsWithTagProfile'}           | ${''}            | ${notAuthorizedCode}
    ${'groupsWithTagMembersName'}       | ${''}            | ${notAuthorizedCode}
    ${'groupsWithTagParentChallenge'}   | ${''}            | ${notAuthorizedCode}
    ${'groupsWithTagParentEcoverse'}    | ${''}            | ${notAuthorizedCode}
    ${'groupsWithTagParentOpportunity'} | ${''}            | ${notAuthorizedCode}
    ${'challengesContributors'}         | ${''}            | ${notAuthorizedCode}
    ${'challengesGroups'}               | ${''}            | ${notAuthorizedCode}
    ${'challengeContributors'}          | ${'challengeId'} | ${notAuthorizedCode}
    ${'challengeGroups'}                | ${'challengeId'} | ${notAuthorizedCode}
    ${'opportunitiesContributors'}      | ${''}            | ${notAuthorizedCode}
    ${'opportunitiesGroups'}            | ${''}            | ${notAuthorizedCode}
    ${'projectsName'}                   | ${''}            | ${notAuthorizedCode}
    ${'projectsTextId'}                 | ${''}            | ${notAuthorizedCode}
    ${'projectsDescription'}            | ${''}            | ${notAuthorizedCode}
    ${'projectsState'}                  | ${''}            | ${notAuthorizedCode}
    ${'projectsTagset'}                 | ${''}            | ${notAuthorizedCode}
    ${'projectsAspects'}                | ${''}            | ${notAuthorizedCode}
  `(
    'should expect: \'$expected\' for query: \'$query\'',
    async ({ query, idName, expected }) => {
      // Act
      const requestParamsQueryData = {
        operationName: null,
        query: getQueries(query, (data as Record<string, number>)[idName]),
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
// FAILING:
// ${challengesLeadOrganisationGroups} | ${notAuthorizedCode}
// ${challengeLeadOrganisationGroups}  | ${notAuthorizedCode}

// Failing scenarios BUG: https://app.zenhub.com/workspaces/cherrytwist-5ecb98b262ebd9f4aec4194c/issues/cherrytwist/server/578
// ${opportunitiesProjectsId}          | ${notAuthorizedCode}
// ${opportunitiesProjectsAspectsId}   | ${notAuthorizedCode}

describe('DDT anonymous user - queries - authorized', () => {
  // Arrange
  test.each`
    query                                   | idName           | expected
    ${'name'}                               | ${''}            | ${notAuthorizedCode}
    ${'hostProfile'}                        | ${''}            | ${notAuthorizedCode}
    ${'contextTagline'}                     | ${''}            | ${notAuthorizedCode}
    ${'contextBackground'}                  | ${''}            | ${notAuthorizedCode}
    ${'contextVision'}                      | ${''}            | ${notAuthorizedCode}
    ${'contextWho'}                         | ${''}            | ${notAuthorizedCode}
    ${'contextImpact'}                      | ${''}            | ${notAuthorizedCode}
    ${'contextReferencesName'}              | ${''}            | ${notAuthorizedCode}
    ${'challengesName'}                     | ${''}            | ${notAuthorizedCode}
    ${'challengesTextId'}                   | ${''}            | ${notAuthorizedCode}
    ${'challengesState'}                    | ${''}            | ${notAuthorizedCode}
    ${'challengesContext'}                  | ${''}            | ${notAuthorizedCode}
    ${'challengesLeadOrganisation'}         | ${''}            | ${notAuthorizedCode}
    ${'challengesTagsets'}                  | ${''}            | ${notAuthorizedCode}
    ${'challengesOpportunities'}            | ${''}            | ${notAuthorizedCode}
    ${'challengeName'}                      | ${'challengeId'} | ${notAuthorizedCode}
    ${'challengeTextId'}                    | ${'challengeId'} | ${notAuthorizedCode}
    ${'challengeState'}                     | ${'challengeId'} | ${notAuthorizedCode}
    ${'challengeContext'}                   | ${'challengeId'} | ${notAuthorizedCode}
    ${'challengeLeadOrganisation'}          | ${'challengeId'} | ${notAuthorizedCode}
    ${'challengeTagsets'}                   | ${'challengeId'} | ${notAuthorizedCode}
    ${'challengeOpportunities'}             | ${'challengeId'} | ${notAuthorizedCode}
    ${'opportunitiesName'}                  | ${''}            | ${notAuthorizedCode}
    ${'opportunitiesTextId'}                | ${''}            | ${notAuthorizedCode}
    ${'opportunitiesState'}                 | ${''}            | ${notAuthorizedCode}
    ${'opportunitiesContext'}               | ${''}            | ${notAuthorizedCode}
    ${'opportunitiesActorgroupsName'}       | ${''}            | ${notAuthorizedCode}
    ${'opportunitiesActorGroupsActorsName'} | ${''}            | ${notAuthorizedCode}
    ${'opportunitiesAspects'}               | ${''}            | ${notAuthorizedCode}
    ${'opportunitiesRelationsName'}         | ${''}            | ${notAuthorizedCode}
  `(
    'should NOT expect: \'$expected\' for query: \'$query\'',
    async ({ query, idName, expected }) => {
      // Act
      const requestParamsQueryData = {
        operationName: null,
        query: getQueries(query, (data as Record<string, number>)[idName]),
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
    mutation                               | variables                               | idName             | expected
    ${'createOrganisationMutation'}        | ${'createOrganisationVariables'}        | ${''}              | ${notAuthorizedCode}
    ${'createReferenceOnProfileMutation'}  | ${'createReferenceOnProfileVariable'}   | ${'userProfileId'} | ${notAuthorizedCode}
    ${'createReferenceOnContextMutation'}  | ${'createReferenceOnContextVariables'}  | ${'contextId'}     | ${notAuthorizedCode}
    ${'createTagsetOnProfileMutation'}     | ${'createTagsetOnProfileVariables'}     | ${'userProfileId'} | ${notAuthorizedCode}
    ${'createGroupOnEcoverseMutation'}     | ${'createGroupOnEcoverseVariables'}     | ${''}              | ${notAuthorizedCode}
    ${'createChallengeMutation'}           | ${'createChallengeVariables'}           | ${''}              | ${notAuthorizedCode}
    ${'createGroupOnChallengeMutation'}    | ${'createGroupOnChallengeVariables'}    | ${'challengeId'}   | ${notAuthorizedCode}
    ${'createOpportunityMutation'}         | ${'createOpportunityVariables'}         | ${'challengeId'}   | ${notAuthorizedCode}
    ${'createGroupOnOpportunityMutations'} | ${'createGroupOnOpportunityVariables'}  | ${'opportunityId'} | ${notAuthorizedCode}
    ${'createProjectMutation'}             | ${'createProjectVariables'}             | ${'opportunityId'} | ${notAuthorizedCode}
    ${'createActorGroupMutation'}          | ${'createActorGroupVariables'}          | ${'opportunityId'} | ${notAuthorizedCode}
    ${'createActorMutation'}               | ${'createActorVariables'}               | ${'actorGroupId'}  | ${notAuthorizedCode}
    ${'createAspectOnOpportunityMutation'} | ${'createAspectOnOpportunityVariables'} | ${'opportunityId'} | ${notAuthorizedCode}
    ${'createRelationMutation'}            | ${'createRelationVariables'}            | ${'opportunityId'} | ${notAuthorizedCode}
    ${'createAspectOnProjectMutation'}     | ${'createAspectOnProjectVariables'}     | ${'projectId'}     | ${notAuthorizedCode}
  `(
    'should expect: \'$expected\' for create mutation: \'$mutation\' and variables: \'$variables\'',
    async ({ mutation, variables, idName, expected }) => {
      // Act
      const requestParamsCreateMutations = {
        operationName: null,
        query: getCreateMutation(mutation),
        variables: getCreateVariables(
          variables,
          (data as Record<string, number>)[idName]
        ),
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
    mutation                                    | variables                                    | idName                        | expected
    ${'updateUserMutation'}                     | ${'updateUserVariables'}                     | ${'userId'}                   | ${notAuthorizedCode}
    ${'updateProfileMutation'}                  | ${'updateProfileVariables'}                  | ${'userProfileId'}            | ${notAuthorizedCode}
    ${'updateOrganisationMutation'}             | ${'updateOrganisationVariabls'}              | ${'organisationId'}           | ${notAuthorizedCode}
    ${'updateChallengeMutation'}                | ${'updateChallengeVariables'}                | ${'challengeId'}              | ${notAuthorizedCode}
    ${'updateOpportunityMutation'}              | ${'updateOpportunityVariables'}              | ${'opportunityId'}            | ${notAuthorizedCode}
    ${'updateAspectMutation'}                   | ${'updateAspectVariable'}                    | ${'aspectId'}                 | ${notAuthorizedCode}
    ${'updateActorMutation'}                    | ${'updateActorVariables'}                    | ${'actorId'}                  | ${notAuthorizedCode}
    ${'addUserToChallengeMutation'}             | ${'addUserToChallengeVariables'}             | ${'challengeId'}              | ${notAuthorizedCode}
    ${'addUserToOpportunityMutation'}           | ${'addUserToOpportunityVariables'}           | ${'opportunityId'}            | ${notAuthorizedCode}
    ${'addUserToGroupMutation'}                 | ${'addUserToGroupVariables'}                 | ${'groupIdEcoverse'}          | ${notAuthorizedCode}
    ${'assignGroupFocalPointMutation'}          | ${'assignGroupFocalPointVariables'}          | ${'groupIdEcoverse'}          | ${notAuthorizedCode}
    ${'removeGroupFocalPointMutation'}          | ${'removeGroupFocalPointVariables'}          | ${'createGroupOnChallengeId'} | ${notAuthorizedCode}
    ${'addChallengeLeadToOrganisationMutation'} | ${'addChallengeLeadToOrganisationVariables'} | ${'challengeId'}              | ${notAuthorizedCode}
    ${'removeUserFromGroupMutation'}            | ${'removeUserFromGroupVariables'}            | ${'addUserToOpportunityId'}   | ${notAuthorizedCode}
    ${'addTagsOnTagsetMutation'}                | ${'addTagsOnTagsetVariables'}                | ${'tagsetId'}                 | ${notAuthorizedCode}
    ${'replaceTagsOnTagsetMutation'}            | ${'replaceTagsOnTagsetVariables'}            | ${'tagsetId'}                 | ${notAuthorizedCode}
  `(
    'should expect: \'$expected\' for update mutation: \'$mutation\' and variables: \'$variables\'',
    async ({ mutation, variables, idName, expected }) => {
      // Act
      const requestParamsUpdateMutations = {
        operationName: null,
        query: getUpdateMutation(mutation),
        variables: getUpdateVariables(
          variables,
          (data as Record<string, number>)[idName]
        ),
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
    mutation                       | variables                       | idName                   | expected
    ${'removeActorMutation'}       | ${'removeActorVariables'}       | ${'actorId'}             | ${notAuthorizedCode}
    ${'removeActorGroupMutation'}  | ${'removeActorGroupVariables'}  | ${'actorGroupId'}        | ${notAuthorizedCode}
    ${'removeAspectMutation'}      | ${'removeAspectVariables'}      | ${'aspectId'}            | ${notAuthorizedCode}
    ${'removeOpportunityMutation'} | ${'removeOpportunityVariables'} | ${'removeOpportunityId'} | ${notAuthorizedCode}
    ${'removeChallengeMutation'}   | ${'removeChallengeVariables'}   | ${'removeChallangeId'}   | ${notAuthorizedCode}
    ${'removeUserMutation'}        | ${'removeUserVariables'}        | ${'userId'}              | ${notAuthorizedCode}
  `(
    'should expect: \'$expected\' for remove mutation: \'$mutation\' and variables: \'$variables\'',
    async ({ mutation, variables, idName, expected }) => {
      // Act
      const requestParamsRemoveMutations = {
        operationName: null,
        query: getRemoveMutation(mutation),
        variables: getRemoveVariables(
          variables,
          (data as Record<string, number>)[idName]
        ),
      };
      const response = await graphqlRequest(requestParamsRemoveMutations);
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toContain(expected);
    }
  );
});
