export const updateUserMutation = `
mutation UpdateUser($userID: Float!, $userData: UserInput!) {
    updateUser(userID: $userID, userData: $userData) {
      name,
        email
    }
  }`;

export const updateUserVariables = (id: number) => `
{
    "userID": ${id},
    "userData":
    {
      "name": "TestName",
      "city": "TestCity"
    }
  }`;

export const updateProfileMutation = `
mutation updateProfile($profileData: ProfileInput!, $ID: Float!) {
    updateProfile(profileData: $profileData, ID: $ID)
  }`;

export const updateProfileVariables = `
{
    "ID": 1,
    "profileData": {
      "description": "some description",
      "avatar": "https://avatar.com"
    }
  }`;

export const updateOrganisationMutation = `
mutation updateOrganisation($orgID: Float!, $organisationData: OrganisationInput!) {
    updateOrganisation(orgID: $orgID, organisationData: $organisationData) {
      name,
      id
    }
  }`;

export const updateOrganisationVariabls = `
{
    "orgID": 1,
    "organisationData":
    {
      "name": "Cherrytwist2"
    }
  }`;

export const updateChallengeMutation = `
mutation updateChallenge($challengeData: UpdateChallengeInput!) {
    updateChallenge(challengeData: $challengeData) {
      name,
      id
    }
  }`;

export const updateChallengeVariables = (id: number) => `
{

    "challengeData":
          {
            "ID": ${id},
            "name": "Challenge with better name"
          }
  }`;

export const updateOpportunityMutation = `
mutation updateOpportunity($opportunityData: OpportunityInput!, $ID: Float!) {
    updateOpportunity(opportunityData: $opportunityData, ID: $ID) {
      name,
      id
    }
  }`;

export const updateOpportunityVariables = `
{
    "ID": ,
    "opportunityData":
    {
      "name": "Test Oportunity "
    }
  }`;

export const updateAspectMutation = `
mutation updateAspect($aspectData: AspectInput!, $ID: Float!) {
    updateAspect(aspectData: $aspectData, ID: $ID) {
      title
    }
  }`;

export const updateAspectVariable = `
{
    "ID": 1,
    "aspectData": {
      "title": "aspect some description",
      "framing": "https://aspect_framing.com",
      "explanation": "https://aspect_explanation.com"
    }
  }`;

export const updateActorMutation = `
mutation updateActor($actorData: ActorInput!, $ID: Float!) {
    updateActor(actorData: $actorData, ID: $ID) {
      name
      description
      value
      impact
    }
  }`;

export const updateActorVariables = `
{
    "ID": 1,
    "actorData": {
      "name": "actor some description",
      "value": "https://actor_value.com",
      "impact": "https://actor_impact.com",
      "description": "actor something"
    }
  }`;

export const addTagsOnTagsetMutation = `
mutation addTagToTagset($tag: String!, $tagsetID: Float!) {
    addTagToTagset(tag: $tag, tagsetID: $tagsetID) {
      name
      tags
    }
  }`;

export const addTagsOnTagsetVariables = `
{
    "tagsetID": 1,
    "tag": "tagTest"
  }`;

export const replaceTagsOnTagsetMutation = `
mutation replaceTagsOnTagset($tags: [String!]!, $tagsetID: Float!) {
    replaceTagsOnTagset(tags: $tags, tagsetID: $tagsetID){
      name
      tags
    }
  }`;

export const replaceTagsOnTagsetVariables = `
{
    "tagsetID": 1,
    "tags": ["tag1", "tag2"]
  }`;

export const addUserToChallengeMutation = `
mutation addUserToChallenge($userID: Float!, $challengeID: Float!) {
    addUserToChallenge(challengeID: $challengeID, userID: $userID) {
      name,
      id,
      members {
        id,
        name
      }
    }
  }`;

export const addUserToChallengeVariables = `
{
    "userID": 1,
    "challengeID": 4
  }`;

export const addUserToGroupMutation = `
mutation addUserToGroup($userID: Float!, $groupID: Float!) {
    addUserToGroup(groupID: $groupID, userID: $userID)
  }`;

export const addUserToGroupVariables = `
{
    "userID": 1,
    "groupID": 1
  }`;

export const addUserToOpportunityMutation = `
mutation addUserToOpportunity($userID: Float!, $opportunityID: Float!) {
    addUserToOpportunity(opportunityID: $opportunityID, userID: $userID) {
      name,
      id,
      members {
        id,
        name
      }
    }
  }`;

export const addUserToOpportunityVariables = `
{
    "userID": 1,
    "opportunityID": 1
  }`;

export const assignGroupFocalPointMutation = `
mutation assignGroupFocalPoint($userID: Float!, $groupID: Float!) {
    assignGroupFocalPoint(groupID: $groupID, userID: $userID) {
      name,
      id,
      focalPoint {
        name
      }
    }
  }`;

export const assignGroupFocalPointVariables = `
  {
    "userID": 1,
    "groupID": 2
  }`;

export const removeGroupFocalPointMutation = `
mutation removeGroupFocalPoint($groupID: Float!) {
    removeGroupFocalPoint(groupID: $groupID) {
      name,
      id,
      focalPoint {
        name
      }
    }
  }`;

export const removeGroupFocalPointVariables = `
{
    "groupID": 2
  }`;

export const addChallengeLeadToOrganisationMutation = `
mutation addChallengeLead($challengeID: Float!, $organisationID: Float!) {
    addChallengeLead(organisationID: $organisationID, challengeID: $challengeID)
  }`;

export const addChallengeLeadToOrganisationVariables = `
{
    "organisationID": 1,
    "challengeID": 2
  }`;

export const removeUserFromGroupMutation = `
mutation removeUserFromGroup($userID: Float!, $groupID: Float!) {
    removeUserFromGroup(groupID: $groupID, userID: $userID) {
      name,
      id,
      members {
        id,
        name
      }
    }
  }`;

export const removeUserFromGroupVariables = `
{
    "userID": 1,
    "groupID": 2
  }`;

const mutations: Record<string, string> = {
  updateUserMutation,
  updateProfileMutation,
  updateOrganisationMutation,
  updateChallengeMutation,
  updateOpportunityMutation,
  updateAspectMutation,
  updateActorMutation,
  addTagsOnTagsetMutation,
  replaceTagsOnTagsetMutation,
  addUserToChallengeMutation,
  addUserToGroupMutation,
  addUserToOpportunityMutation,
  assignGroupFocalPointMutation,
  removeGroupFocalPointMutation,
  addChallengeLeadToOrganisationMutation,
  removeUserFromGroupMutation,
};

const variables: Record<string, (id: number) => string> = {
  updateUserVariables,
  // updateProfileVariables,
  // updateOrganisationVariabls,
  updateChallengeVariables,
  // updateOpportunityVariables,
  // updateAspectVariable,
  // updateActorVariables,
  // addTagsOnTagsetVariables,
  // replaceTagsOnTagsetVariables,
  // addUserToChallengeVariables,
  // addUserToGroupVariables,
  // addUserToOpportunityVariables,
  // assignGroupFocalPointVariables,
  // removeGroupFocalPointVariables,
  // addChallengeLeadToOrganisationVariables,
  // removeUserFromGroupVariables,
};
export const getMutation = (name: string) => {
  return mutations[name];
};

export const getVariables = (name: string, id: number) => {
  return variables[name](id);
};
