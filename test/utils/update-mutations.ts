const updateUserMutation = `
mutation UpdateUser($userID: Float!, $userData: UserInput!) {
    updateUser(userID: $userID, userData: $userData) {
      name,
        email
    }
  }`;

const updateUserVariables = `
{
    "userID": 1,
    "userData":
    {
      "name": "TestName",
      "city": "TestCity"
    }
  }`;

const updateProfileMutation = `
mutation updateProfile($profileData: ProfileInput!, $ID: Float!) {
    updateProfile(profileData: $profileData, ID: $ID)
  }`;

const updateProfileVariables = `
{
    "ID": 1,
    "profileData": {
      "description": "some description",
      "avatar": "http://someUri"
    }
  }`;

const updateOrganisationMutation = `
mutation updateOrganisation($orgID: Float!, $organisationData: OrganisationInput!) {
    updateOrganisation(orgID: $orgID, organisationData: $organisationData) {
      name,
      id
    }
  }`;

const updateOrganisationVariabls = `
{
    "orgID": 1,
    "organisationData":
    {
      "name": "Cherrytwist2"
    }
  }`;

const updateChallengeMutation = `  
mutation UpdateChallenge($challengeID: Float! $challengeData: ChallengeInput!) {
    updateChallenge(challengeID: $challengeID, challengeData: $challengeData) {
      name,
      id
    }
  }`;

const updateChallengeVariables = `
{
    "challengeID": 1,
    "challengeData":
          {
            "name": "Challenge with better name"                
          }
  }`;

const updateOpportunityMutation = `
mutation updateOpportunity($opportunityData: OpportunityInput!, $ID: Float!) {
    updateOpportunity(opportunityData: $opportunityData, ID: $ID) {
      name,
      id
    }
  }`;

const updateOpportunityVariables = `
{
    "ID": 1,
    "opportunityData":
    {
      "name": "Test Oportunity "
    }
  }`;

const updateAspectMutation = `
mutation updateAspect($aspectData: AspectInput!, $ID: Float!) {
    updateAspect(aspectData: $aspectData, ID: $ID) {
      title
    }
  }`;

const updateAspectVariable = `
{
    "ID": 1,
    "aspectData": {
      "title": "aspect some description",
      "framing": "aspect http://someUri",
      "explanation": "aspect http://someUri"
    }
  }`;

const updateActorMutation = `  
mutation updateActor($actorData: ActorInput!, $ID: Float!) {
    updateActor(actorData: $actorData, ID: $ID) {    
      name
      description
      value
      impact
    }
  }`;

const updateActorVariables = `
{
    "ID": 1,
    "actorData": {
      "name": "actor some description",
      "value": "actor http://someUri",
      "impact": "actor http://someUri",
      "description": "actor something"
    }
  }`;

const addTagsOnTagsetMutation = `
mutation addTagToTagset($tag: String!, $tagsetID: Float!) {
    addTagToTagset(tag: $tag, tagsetID: $tagsetID) {
      name
      tags
    }
  }`;

const addTagsOnTagsetVariables = `
{
    "tagsetID": 1,
    "tag": "tagTest"
  }`;

const replaceTagsOnTagsetMutation = `
mutation replaceTagsOnTagset($tags: [String!]!, $tagsetID: Float!) {
    replaceTagsOnTagset(tags: $tags, tagsetID: $tagsetID){
      name
      tags
    }
  }`;

const replaceTagsOnTagsetVariables = `
{
    "tagsetID": 1,
    "tags": ["tag1", "tag2"]
  }`;

const addUserToChallengeMutation = `
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

const addUserToChallengeVariables = `
{
    "userID": 1,
    "challengeID": 1
  }`;

const addUserToGroupMutation = `
mutation addUserToGroup($userID: Float!, $groupID: Float!) {
    addUserToGroup(groupID: $groupID, userID: $userID) 
  }`;

const addUserToGroupVariables = `
{
    "userID": 1,
    "groupID": 1
  }`;

const addUserToOpportunityMutation = `
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

const addUserToOpportunityVariables = `
{
    "userID": 1,
    "opportunityID": 1
  }`;

const assignGroupFocalPointMutation = `
mutation assignGroupFocalPoint($userID: Float!, $groupID: Float!) {
    assignGroupFocalPoint(groupID: $groupID, userID: $userID) {
      name,
      id,
      focalPoint {
        name
      }
    }
  }`;

const assignGroupFocalPointVariables = `
  {
    "userID": 1,
    "groupID": 2
  }`;

const removeGroupFocalPointMutation = `
mutation removeGroupFocalPoint($groupID: Float!) {
    removeGroupFocalPoint(groupID: $groupID) {
      name,
      id,
      focalPoint {
        name
      }
    }
  }`;

const removeGroupFocalPointVariables = `
{
    "groupID": 2
  }`;

const addChallengeLeadToOrganisationMutation = `
mutation addChallengeLead($challengeID: Float!, $organisationID: Float!) {
    addChallengeLead(organisationID: $organisationID, challengeID: $challengeID)
  }`;

const addChallengeLeadToOrganisationVariables = `
{
    "organisationID": 1,
    "challengeID": 1
  }`;

const removeUserFromGroupMutation = `
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

const removeUserFromGroupVariables = `
{
    "userID": 1,
    "groupID": 2
  }`;

export {
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
};
