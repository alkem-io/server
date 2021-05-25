const userId = 4;
const organisationId = 1;
const communityId = 1;

export const updateUserMutation = `
mutation UpdateUser($userData: UpdateUserInput!) {
  updateUser(userData: $userData) {
      id
      name
      email
      city
    }
  }`;

export const updateUserVariables = (id: string) => `
{
    "userData":
    {
      "ID": "${userId}",
      "name": "TestName",
      "city": "TestCity"
    }
  }`;

export const updateNonEcoverseMutation = `
mutation UpdateUser($userData: UpdateUserInput!) {
  updateUser(userData: $userData) {
      id
      name
      email
      city
      profile{
        description
      }
    }
  }`;

export const updateNonEcoverseVariables = (id: string) => `
{

    "userData":
    {
      "ID": "${id}",
      "name": "TestName",
      "city": "TestCity"
    }
  }`;

export const updateProfileMutation = `

mutation updateProfile($profileData: UpdateProfileInput!) {
  updateProfile(profileData: $profileData)
  {
    id
  }
}`;

export const updateProfileVariables = (id: string) => `
{
    "profileData": {
      "ID": "${id}",
      "description": "some description",
      "avatar": "https://avatar.com"
    }
  }`;

export const updateOrganisationMutation = `
mutation updateOrganisation($organisationData: UpdateOrganisationInput!) {
  updateOrganisation(organisationData: $organisationData) {
    name,
    id
  }
}`;

export const updateOrganisationVariabls = (id: string) => `
{
    "organisationData":
    {
      "ID": "${id}",
      "name": "Cherrytwist77"
    }
  }`;

export const updateChallengeMutation = `
mutation UpdateChallenge($challengeData: UpdateChallengeInput!) {
  updateChallenge(challengeData: $challengeData) {
      name,
      id
    }
  }`;

export const updateChallengeVariables = (id: string) => `
{
    "challengeData":
          {
            "ID": "${id}",
            "name": "Challenge with better name"
          }
  }`;

export const updateOpportunityMutation = `
mutation updateOpportunity($opportunityData: UpdateOpportunityInput!) {
  updateOpportunity(opportunityData: $opportunityData) {
      name,
      id
    }
  }`;

export const updateOpportunityVariables = (id: string) => `
{
    "opportunityData":
    {
      "ID": "${id}",
      "name": "Test Oportunity "
    }
  }`;

export const updateAspectMutation = `
mutation updateAspect($aspectData: UpdateAspectInput!) {
  updateAspect(aspectData: $aspectData) {
      title
      id
    }
  }`;

export const updateAspectVariable = (id: string) => `
{
    "aspectData": {
      "ID": "${id}",
      "title": "aspect some description",
      "framing": "https://aspect_framing.com",
      "explanation": "https://aspect_explanation.com"
    }
  }`;

export const updateActorMutation = `
mutation updateActor($actorData: UpdateActorInput!) {
  updateActor(actorData: $actorData) {
      name
      description
      value
      impact
      id
    }
  }`;

export const updateActorVariables = (id: string) => `
{
    "actorData": {
      "ID": "${id}",
      "name": "actor some description",
      "value": "https://actor_value.com",
      "impact": "https://actor_impact.com",
      "description": "actor something"
    }
  }`;

export const addUserToCommunityMutation = `
mutation assignUserToCommunity($membershipData: AssignCommunityMemberInput!) {
  assignUserToCommunity(membershipData: $membershipData) {
      name,
      id,
      members {
        id,
        name
      }
    }
  }`;

export const addUserToCommunityVariables = (id: string) => `
{
  "membershipData": {
    "userID": ${userId},
    "communityID": ${communityId}
  }
}`;

export const addUserToGroupMutation = `
mutation assignUserToGroup($membershipData: AssignUserGroupMemberInput!) {
  assignUserToGroup(membershipData: $membershipData)
  {
    name,
    id,
    members {
      id,
      name
    }
  }
}`;

export const addUserToGroupVariables = (id: string) => `
{
  "membershipData": {
    "userID": ${userId},
    "groupID": ${id}
  }
}`;

// export const assignGroupFocalPointMutation = `
// mutation assignGroupFocalPoint($membershipData: AssignUserGroupFocalPointInput!) {
//   assignGroupFocalPoint(membershipData: $membershipData) {
//       name,
//       id,
//       focalPoint {
//         name
//       }
//     }
//   }`;

// export const assignGroupFocalPointVariables = (id: number) => `
// {
//   "membershipData": {
//     "userID": ${userId},
//     "groupID": ${id}
//   }
// }`;

// export const removeGroupFocalPointMutation = `
// mutation removeGroupFocalPoint($removeData: RemoveUserGroupFocalPoint!) {
//   removeGroupFocalPoint(removeData: $removeData) {
//       name,
//       id,
//       focalPoint {
//         name
//       }
//     }
//   }`;

// export const removeGroupFocalPointVariables = (id: number) => `
// {
//   "removeData": {
//     "groupID": ${id}
//   }
// }`;

export const addChallengeLeadToOrganisationMutation = `
mutation assignChallengeLead($assignInput: AssignChallengeLeadInput!) {
  assignChallengeLead(assignInput: $assignInput)
  {
    id
  }
}`;

export const addChallengeLeadToOrganisationVariables = (id: string) => `
{
  "assignInput":{
    "organisationID": "${organisationId}",
    "challengeID": "${id}"
  }
}`;

export const removeUserFromGroupMutation = `
mutation removeUserFromGroup($membershipData: RemoveUserGroupMemberInput!) {
  removeUserFromGroup(membershipData: $membershipData) {
      name,
      id,
      members {
        id,
        name
      }
    }
  }`;

export const removeUserFromGroupVariables = (id: string) => `
{
  "membershipData": {
    "userID": ${userId},
    "groupID": ${id}
  }
}`;

const mutations: Record<string, string> = {
  updateUserMutation,
  updateProfileMutation,
  updateOrganisationMutation,
  updateChallengeMutation,
  updateOpportunityMutation,
  updateAspectMutation,
  updateActorMutation,
  addUserToCommunityMutation,
  addUserToGroupMutation,
  addChallengeLeadToOrganisationMutation,
  removeUserFromGroupMutation,
  updateNonEcoverseMutation,
};

const variables: Record<string, (id: string, emailName?: any) => string> = {
  updateUserVariables,
  updateProfileVariables,
  updateOrganisationVariabls,
  updateChallengeVariables,
  updateOpportunityVariables,
  updateAspectVariable,
  updateActorVariables,
  addUserToCommunityVariables,
  addUserToGroupVariables,
  addChallengeLeadToOrganisationVariables,
  removeUserFromGroupVariables,
  updateNonEcoverseVariables,
};

export const getUpdateMutation = (name: string) => {
  return mutations[name];
};

export const getUpdateVariables = (name: string, id: any, emailName?: any) => {
  return variables[name](id, emailName);
};
