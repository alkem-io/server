const removeUserMutation = `
mutation removeUser($userID: Float!) {
    removeUser(userID: $userID)
  }`;

const removeUserVariables = `
{
    "userID": 1
  }`;

const removeChallengeMutation = `
mutation removeChallenge($ID: Float!) {
    removeChallenge(ID: $ID)
  }`;

const removeChallengeVariables = `
{
    "ID": 1
  }`;

const removeAspectMutation = `
mutation removeAspect($ID: Float!) {
    removeAspect(ID: $ID)
  }`;

const removeAspectVariables = `
  {
    "ID": 1
  }`;

const removeActorMutation = `
mutation removeActor($ID: Float!) {
    removeActor(ID: $ID)
  }`;

const removeActorVariables = `
{
    "ID": 1
  }`;

const removeActorGroupMutation = `
mutation removeActorGroup($ID: Float!) {
    removeActorGroup(ID: $ID)
  }`;

const removeActorGroupVariables = `
  {
      "ID": 1
    }`;

export {
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
};
