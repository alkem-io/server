import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { TestUser } from '@test/utils/token.helper';
import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';
import { getQueries } from '@test/non-functional/auth/queries';

import {
  getCreateMutation,
  getCreateVariables,
} from '@test/non-functional/auth/create-mutations';

import {
  getUpdateMutation,
  getUpdateVariables,
} from '@test/non-functional/auth/update-mutations';

import {
  getRemoveMutation,
  getRemoveVariables,
} from '@test/non-functional/auth/remove-mutations';

import { TestDataServiceInitResult } from '@utils/data-management/test-data.service';

const notAuthorizedCode = '"code":"UNAUTHENTICATED"';
let data: TestDataServiceInitResult;

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
  data = appSingleton.Instance.getData();
});

afterAll(async () => {
  if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
});

describe('DDT ecoverse admin user - queries - authorized', () => {
  // Arrange
  test.each`
    query                                   | idName           | expected
    ${'name'}                               | ${''}            | ${notAuthorizedCode}
    ${'hostGroups'}                         | ${''}            | ${notAuthorizedCode}
    ${'hostMembers'}                        | ${''}            | ${notAuthorizedCode}
    ${'hostProfile'}                        | ${''}            | ${notAuthorizedCode}
    ${'contextTagline'}                     | ${''}            | ${notAuthorizedCode}
    ${'contextBackground'}                  | ${''}            | ${notAuthorizedCode}
    ${'contextVision'}                      | ${''}            | ${notAuthorizedCode}
    ${'contextWho'}                         | ${''}            | ${notAuthorizedCode}
    ${'contextImpact'}                      | ${''}            | ${notAuthorizedCode}
    ${'contextReferencesName'}              | ${''}            | ${notAuthorizedCode}
    ${'usersName'}                          | ${''}            | ${notAuthorizedCode}
    ${'usersAccountUPN'}                    | ${''}            | ${notAuthorizedCode}
    ${'usersProfile'}                       | ${''}            | ${notAuthorizedCode}
    ${'usersMemberofGroupsName'}            | ${''}            | ${notAuthorizedCode}
    ${'usersMemberofChallengesName'}        | ${''}            | ${notAuthorizedCode}
    ${'usersMemberofOrganisationsName'}     | ${''}            | ${notAuthorizedCode}
    ${'userName'}                           | ${'userId'}      | ${notAuthorizedCode}
    ${'userAccountUPN'}                     | ${'userId'}      | ${notAuthorizedCode}
    ${'userProfile'}                        | ${'userId'}      | ${notAuthorizedCode}
    ${'userMemberofGroupsName'}             | ${'userId'}      | ${notAuthorizedCode}
    ${'userMemberofChallengesName'}         | ${'userId'}      | ${notAuthorizedCode}
    ${'userMemberofOrganisationsName'}      | ${'userId'}      | ${notAuthorizedCode}
    ${'usersById'}                          | ${''}            | ${notAuthorizedCode}
    ${'groupsName'}                         | ${''}            | ${notAuthorizedCode}
    ${'groupsFocalPointName'}               | ${''}            | ${notAuthorizedCode}
    ${'groupsProfile'}                      | ${''}            | ${notAuthorizedCode}
    ${'groupsMembersName'}                  | ${''}            | ${notAuthorizedCode}
    ${'groupsParentChallenge'}              | ${''}            | ${notAuthorizedCode}
    ${'groupsParentEcoverse'}               | ${''}            | ${notAuthorizedCode}
    ${'groupsParentOpportunity'}            | ${''}            | ${notAuthorizedCode}
    ${'groupsWithTagName'}                  | ${''}            | ${notAuthorizedCode}
    ${'groupsWithTagFocalPointName'}        | ${''}            | ${notAuthorizedCode}
    ${'groupsWithTagProfile'}               | ${''}            | ${notAuthorizedCode}
    ${'groupsWithTagMembersName'}           | ${''}            | ${notAuthorizedCode}
    ${'groupsWithTagParentChallenge'}       | ${''}            | ${notAuthorizedCode}
    ${'groupsWithTagParentEcoverse'}        | ${''}            | ${notAuthorizedCode}
    ${'groupsWithTagParentOpportunity'}     | ${''}            | ${notAuthorizedCode}
    ${'challengesName'}                     | ${''}            | ${notAuthorizedCode}
    ${'challengesTextId'}                   | ${''}            | ${notAuthorizedCode}
    ${'challengesState'}                    | ${''}            | ${notAuthorizedCode}
    ${'challengesContext'}                  | ${''}            | ${notAuthorizedCode}
    ${'challengesLeadOrganisation'}         | ${''}            | ${notAuthorizedCode}
    ${'challengesLeadOrganisationGroups'}   | ${''}            | ${notAuthorizedCode}
    ${'challengesContributors'}             | ${''}            | ${notAuthorizedCode}
    ${'challengesTagsets'}                  | ${''}            | ${notAuthorizedCode}
    ${'challengesGroups'}                   | ${''}            | ${notAuthorizedCode}
    ${'challengesOpportunities'}            | ${''}            | ${notAuthorizedCode}
    ${'challengeName'}                      | ${'challengeId'} | ${notAuthorizedCode}
    ${'challengeTextId'}                    | ${'challengeId'} | ${notAuthorizedCode}
    ${'challengeState'}                     | ${'challengeId'} | ${notAuthorizedCode}
    ${'challengeContext'}                   | ${'challengeId'} | ${notAuthorizedCode}
    ${'challengeLeadOrganisation'}          | ${'challengeId'} | ${notAuthorizedCode}
    ${'challengeLeadOrganisationGroups'}    | ${'challengeId'} | ${notAuthorizedCode}
    ${'challengeContributors'}              | ${'challengeId'} | ${notAuthorizedCode}
    ${'challengeTagsets'}                   | ${'challengeId'} | ${notAuthorizedCode}
    ${'challengeGroups'}                    | ${'challengeId'} | ${notAuthorizedCode}
    ${'challengeOpportunities'}             | ${'challengeId'} | ${notAuthorizedCode}
    ${'opportunitiesName'}                  | ${''}            | ${notAuthorizedCode}
    ${'opportunitiesTextId'}                | ${''}            | ${notAuthorizedCode}
    ${'opportunitiesState'}                 | ${''}            | ${notAuthorizedCode}
    ${'opportunitiesContext'}               | ${''}            | ${notAuthorizedCode}
    ${'opportunitiesContributors'}          | ${''}            | ${notAuthorizedCode}
    ${'opportunitiesGroups'}                | ${''}            | ${notAuthorizedCode}
    ${'opportunitiesActorgroupsName'}       | ${''}            | ${notAuthorizedCode}
    ${'opportunitiesActorGroupsActorsName'} | ${''}            | ${notAuthorizedCode}
    ${'opportunitiesAspects'}               | ${''}            | ${notAuthorizedCode}
    ${'opportunitiesRelationsName'}         | ${''}            | ${notAuthorizedCode}
    ${'projectsName'}                       | ${''}            | ${notAuthorizedCode}
    ${'projectsTextId'}                     | ${''}            | ${notAuthorizedCode}
    ${'projectsDescription'}                | ${''}            | ${notAuthorizedCode}
    ${'projectsState'}                      | ${''}            | ${notAuthorizedCode}
    ${'projectsTagset'}                     | ${''}            | ${notAuthorizedCode}
    ${'projectsAspects'}                    | ${''}            | ${notAuthorizedCode}
  `(
    "should NOT expect: '$expected' for query: '$query'",
    async ({ query, idName, expected }) => {
      // Act
      const requestParamsQueryData = {
        operationName: null,
        query: getQueries(query, (data as Record<string, number>)[idName]),
        variables: null,
      };
      const response = await graphqlRequestAuth(
        requestParamsQueryData,
        TestUser.ECOVERSE_ADMIN
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

describe('DDT ecoverse admin user - Create mutations - authorized', () => {
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
    "should NOT expect: '$expected' for create mutation: '$mutation' and variables: '$variables'",
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
      const response = await graphqlRequestAuth(
        requestParamsCreateMutations,
        TestUser.ECOVERSE_ADMIN
      );
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).not.toContain(expected);
    }
  );
});

//  Scenario excluded not to load with fake data the AAD   ${createUserMutation}   | ${createUserVariables}  | ${notAuthorizedCode}

describe('DDT ecoverse admin user - Update mutations - authorized', () => {
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
    "should NOT expect: '$expected' for update mutation: '$mutation' and variables: '$variables'",
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
      const response = await graphqlRequestAuth(
        requestParamsUpdateMutations,
        TestUser.GLOBAL_ADMIN
      );
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).not.toContain(expected);
    }
  );
});

describe('DDT ecoverse admin user - Remove mutations - authorized', () => {
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
    "should NOT expect: '$expected' for remove mutation: '$mutation' and variables: '$variables'",
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
      const response = await graphqlRequestAuth(
        requestParamsRemoveMutations,
        TestUser.ECOVERSE_ADMIN
      );
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).not.toContain(expected);
    }
  );
});
