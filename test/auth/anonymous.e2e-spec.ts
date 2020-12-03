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
      const requestParamsCreateChallenge = {
        operationName: null,
        query: `${query}`,
        variables: null,
      };
      const response = await graphqlRequestAuth(requestParamsCreateChallenge);
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
