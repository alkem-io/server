import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { TestUser } from '@test/utils/token.helper';
import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';
import {
  getQueries,
} from '@test/non-functional/auth/queries';

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

const forbiddenCode = '"code":"FORBIDDEN"';
let data: TestDataServiceInitResult;

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
  data = appSingleton.Instance.getData();
});

afterAll(async () => {
  if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
});

describe('DDT community admin user - queries - authorized', () => {
  // Arrange
  test.each`
    query                                   | idName           | expected
    ${'name'}                               | ${''}            | ${forbiddenCode}
    ${'hostGroups'}                         | ${''}            | ${forbiddenCode}
    ${'hostMembers'}                        | ${''}            | ${forbiddenCode}
    ${'hostProfile'}                        | ${''}            | ${forbiddenCode}
    ${'contextTagline'}                     | ${''}            | ${forbiddenCode}
    ${'contextBackground'}                  | ${''}            | ${forbiddenCode}
    ${'contextVision'}                      | ${''}            | ${forbiddenCode}
    ${'contextWho'}                         | ${''}            | ${forbiddenCode}
    ${'contextImpact'}                      | ${''}            | ${forbiddenCode}
    ${'contextReferencesName'}              | ${''}            | ${forbiddenCode}
    ${'usersName'}                          | ${''}            | ${forbiddenCode}
    ${'usersAccountUPN'}                    | ${''}            | ${forbiddenCode}
    ${'usersProfile'}                       | ${''}            | ${forbiddenCode}
    ${'usersMemberofGroupsName'}            | ${''}            | ${forbiddenCode}
    ${'usersMemberofChallengesName'}        | ${''}            | ${forbiddenCode}
    ${'usersMemberofOrganisationsName'}     | ${''}            | ${forbiddenCode}
    ${'userName'}                           | ${'userId'}      | ${forbiddenCode}
    ${'userAccountUPN'}                     | ${'userId'}      | ${forbiddenCode}
    ${'userProfile'}                        | ${'userId'}      | ${forbiddenCode}
    ${'userMemberofGroupsName'}             | ${'userId'}      | ${forbiddenCode}
    ${'userMemberofChallengesName'}         | ${'userId'}      | ${forbiddenCode}
    ${'userMemberofOrganisationsName'}      | ${'userId'}      | ${forbiddenCode}
    ${'usersById'}                          | ${''}            | ${forbiddenCode}
    ${'groupsName'}                         | ${''}            | ${forbiddenCode}
    ${'groupsFocalPointName'}               | ${''}            | ${forbiddenCode}
    ${'groupsProfile'}                      | ${''}            | ${forbiddenCode}
    ${'groupsMembersName'}                  | ${''}            | ${forbiddenCode}
    ${'groupsParentChallenge'}              | ${''}            | ${forbiddenCode}
    ${'groupsParentEcoverse'}               | ${''}            | ${forbiddenCode}
    ${'groupsParentOpportunity'}            | ${''}            | ${forbiddenCode}
    ${'groupsWithTagName'}                  | ${''}            | ${forbiddenCode}
    ${'groupsWithTagFocalPointName'}        | ${''}            | ${forbiddenCode}
    ${'groupsWithTagProfile'}               | ${''}            | ${forbiddenCode}
    ${'groupsWithTagMembersName'}           | ${''}            | ${forbiddenCode}
    ${'groupsWithTagParentChallenge'}       | ${''}            | ${forbiddenCode}
    ${'groupsWithTagParentEcoverse'}        | ${''}            | ${forbiddenCode}
    ${'groupsWithTagParentOpportunity'}     | ${''}            | ${forbiddenCode}
    ${'challengesName'}                     | ${''}            | ${forbiddenCode}
    ${'challengesTextId'}                   | ${''}            | ${forbiddenCode}
    ${'challengesState'}                    | ${''}            | ${forbiddenCode}
    ${'challengesContext'}                  | ${''}            | ${forbiddenCode}
    ${'challengesLeadOrganisation'}         | ${''}            | ${forbiddenCode}
    ${'challengesLeadOrganisationGroups'}   | ${''}            | ${forbiddenCode}
    ${'challengesContributors'}             | ${''}            | ${forbiddenCode}
    ${'challengesTagsets'}                  | ${''}            | ${forbiddenCode}
    ${'challengesGroups'}                   | ${''}            | ${forbiddenCode}
    ${'challengesOpportunities'}            | ${''}            | ${forbiddenCode}
    ${'challengeName'}                      | ${'challengeId'} | ${forbiddenCode}
    ${'challengeTextId'}                    | ${'challengeId'} | ${forbiddenCode}
    ${'challengeState'}                     | ${'challengeId'} | ${forbiddenCode}
    ${'challengeContext'}                   | ${'challengeId'} | ${forbiddenCode}
    ${'challengeLeadOrganisation'}          | ${'challengeId'} | ${forbiddenCode}
    ${'challengeLeadOrganisationGroups'}    | ${'challengeId'} | ${forbiddenCode}
    ${'challengeContributors'}              | ${'challengeId'} | ${forbiddenCode}
    ${'challengeTagsets'}                   | ${'challengeId'} | ${forbiddenCode}
    ${'challengeGroups'}                    | ${'challengeId'} | ${forbiddenCode}
    ${'challengeOpportunities'}             | ${'challengeId'} | ${forbiddenCode}
    ${'opportunitiesName'}                  | ${''}            | ${forbiddenCode}
    ${'opportunitiesTextId'}                | ${''}            | ${forbiddenCode}
    ${'opportunitiesState'}                 | ${''}            | ${forbiddenCode}
    ${'opportunitiesContext'}               | ${''}            | ${forbiddenCode}
    ${'opportunitiesContributors'}          | ${''}            | ${forbiddenCode}
    ${'opportunitiesGroups'}                | ${''}            | ${forbiddenCode}
    ${'opportunitiesActorgroupsName'}       | ${''}            | ${forbiddenCode}
    ${'opportunitiesActorGroupsActorsName'} | ${''}            | ${forbiddenCode}
    ${'opportunitiesAspects'}               | ${''}            | ${forbiddenCode}
    ${'opportunitiesRelationsName'}         | ${''}            | ${forbiddenCode}
    ${'projectsName'}                       | ${''}            | ${forbiddenCode}
    ${'projectsTextId'}                     | ${''}            | ${forbiddenCode}
    ${'projectsDescription'}                | ${''}            | ${forbiddenCode}
    ${'projectsState'}                      | ${''}            | ${forbiddenCode}
    ${'projectsTagset'}                     | ${''}            | ${forbiddenCode}
    ${'projectsAspects'}                    | ${''}            | ${forbiddenCode}
  `(
    "should expect: '$expected' for query: '$query'",
    async ({ query, idName, expected }) => {
      // Act
      const requestParamsQueryData = {
        operationName: null,
        query: getQueries(query, (data as Record<string, number>)[idName]),
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
  // ArrangeidName
  test.each`
    mutation                              | variables                              | idName             | expected
    ${'createOrganisationMutation'}       | ${'createOrganisationVariables'}       | ${''}              | ${forbiddenCode}
    ${'createReferenceOnProfileMutation'} | ${'createReferenceOnProfileVariable'}  | ${'userProfileId'} | ${forbiddenCode}
    ${'createReferenceOnContextMutation'} | ${'createReferenceOnContextVariables'} | ${'contextId'}     | ${forbiddenCode}
    ${'createTagsetOnProfileMutation'}    | ${'createTagsetOnProfileVariables'}    | ${'userProfileId'} | ${forbiddenCode}
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
    mutation                               | variables                               | idName             | expected
    ${'createGroupOnEcoverseMutation'}     | ${'createGroupOnEcoverseVariables'}     | ${''}              | ${forbiddenCode}
    ${'createChallengeMutation'}           | ${'createChallengeVariables'}           | ${''}              | ${forbiddenCode}
    ${'createGroupOnChallengeMutation'}    | ${'createGroupOnChallengeVariables'}    | ${'challengeId'}   | ${forbiddenCode}
    ${'createOpportunityMutation'}         | ${'createOpportunityVariables'}         | ${'challengeId'}   | ${forbiddenCode}
    ${'createGroupOnOpportunityMutations'} | ${'createGroupOnOpportunityVariables'}  | ${'opportunityId'} | ${forbiddenCode}
    ${'createProjectMutation'}             | ${'createProjectVariables'}             | ${'opportunityId'} | ${forbiddenCode}
    ${'createActorGroupMutation'}          | ${'createActorGroupVariables'}          | ${'opportunityId'} | ${forbiddenCode}
    ${'createActorMutation'}               | ${'createActorVariables'}               | ${'actorGroupId'}  | ${forbiddenCode}
    ${'createAspectOnOpportunityMutation'} | ${'createAspectOnOpportunityVariables'} | ${'opportunityId'} | ${forbiddenCode}
    ${'createRelationMutation'}            | ${'createRelationVariables'}            | ${'opportunityId'} | ${forbiddenCode}
    ${'createAspectOnProjectMutation'}     | ${'createAspectOnProjectVariables'}     | ${'projectId'}     | ${forbiddenCode}
  `(
    "should expect: '$expected' for create mutation: '$mutation' and variables: '$variables'",
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
    mutation                                    | variables                                    | idName                        | expected
    ${'updateUserMutation'}                     | ${'updateUserVariables'}                     | ${'userId'}                   | ${forbiddenCode}
    ${'updateProfileMutation'}                  | ${'updateProfileVariables'}                  | ${'userProfileId'}            | ${forbiddenCode}
    ${'updateOrganisationMutation'}             | ${'updateOrganisationVariabls'}              | ${'organisationId'}           | ${forbiddenCode}
    ${'addUserToChallengeMutation'}             | ${'addUserToChallengeVariables'}             | ${'challengeId'}              | ${forbiddenCode}
    ${'addUserToOpportunityMutation'}           | ${'addUserToOpportunityVariables'}           | ${'opportunityId'}            | ${forbiddenCode}
    ${'addUserToGroupMutation'}                 | ${'addUserToGroupVariables'}                 | ${'groupIdEcoverse'}          | ${forbiddenCode}
    ${'assignGroupFocalPointMutation'}          | ${'assignGroupFocalPointVariables'}          | ${'groupIdEcoverse'}          | ${forbiddenCode}
    ${'removeGroupFocalPointMutation'}          | ${'removeGroupFocalPointVariables'}          | ${'createGroupOnChallengeId'} | ${forbiddenCode}
    ${'addChallengeLeadToOrganisationMutation'} | ${'addChallengeLeadToOrganisationVariables'} | ${'challengeId'}              | ${forbiddenCode}
    ${'removeUserFromGroupMutation'}            | ${'removeUserFromGroupVariables'}            | ${'addUserToOpportunityId'}   | ${forbiddenCode}
    ${'addTagsOnTagsetMutation'}                | ${'addTagsOnTagsetVariables'}                | ${'tagsetId'}                 | ${forbiddenCode}
    ${'replaceTagsOnTagsetMutation'}            | ${'replaceTagsOnTagsetVariables'}            | ${'tagsetId'}                 | ${forbiddenCode}
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
    mutation                       | variables                       | idName             | expected
    ${'updateChallengeMutation'}   | ${'updateChallengeVariables'}   | ${'challengeId'}   | ${forbiddenCode}
    ${'updateOpportunityMutation'} | ${'updateOpportunityVariables'} | ${'opportunityId'} | ${forbiddenCode}
    ${'updateAspectMutation'}      | ${'updateAspectVariable'}       | ${'aspectId'}      | ${forbiddenCode}
    ${'updateActorMutation'}       | ${'updateActorVariables'}       | ${'actorId'}       | ${forbiddenCode}
  `(
    "should expect: '$expected' for update mutation: '$mutation' and variables: '$variables'",
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
    mutation                | variables                | idName      | expected
    ${'removeUserMutation'} | ${'removeUserVariables'} | ${'userId'} | ${forbiddenCode}
  `(
    "should expect: '$expected' for remove mutation: '$mutation' and variables: '$variables'",
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
    mutation                       | variables                       | idName                   | expected
    ${'removeActorMutation'}       | ${'removeActorVariables'}       | ${'actorId'}             | ${forbiddenCode}
    ${'removeActorGroupMutation'}  | ${'removeActorGroupVariables'}  | ${'actorGroupId'}        | ${forbiddenCode}
    ${'removeAspectMutation'}      | ${'removeAspectVariables'}      | ${'aspectId'}            | ${forbiddenCode}
    ${'removeOpportunityMutation'} | ${'removeOpportunityVariables'} | ${'removeOpportunityId'} | ${forbiddenCode}
    ${'removeChallengeMutation'}   | ${'removeChallengeVariables'}   | ${'removeChallangeId'}   | ${forbiddenCode}
  `(
    "should expect: '$expected' for remove mutation: '$mutation' and variables: '$variables'",
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
        TestUser.COMMUNITY_ADMIN
      );
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toContain(expected);
    }
  );
});
