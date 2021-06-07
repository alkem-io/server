export const removeUserMutation = `
mutation deleteUser($deleteData: DeleteUserInput!) {
  deleteUser(deleteData: $deleteData) {
      id
      name
    }}`;

export const removeUserVariables = (id: string) => `
{
  "deleteData": {
    "ID": ${id}
  }
}`;

export const removeChallengeMutation = `
mutation deleteChallenge($deleteData: DeleteChallengeInput!) {
  deleteChallenge(deleteData: $deleteData) {
    id
  }}`;

export const removeChallengeVariables = (id: string) => `
{
  "deleteData": {
    "ID": ${id}
  }
}`;

export const removeOpportunityMutation = `
mutation deleteOpportunity($deleteData: DeleteOpportunityInput!) {
  deleteOpportunity(deleteData: $deleteData) {
    id
  }}`;

export const removeOpportunityVariables = (id: string) => `
{
  "deleteData": {
    "ID": ${id}
  }
}`;

export const removeAspectMutation = `
mutation deleteAspect($deleteData: DeleteAspectInput!) {
  deleteAspect(deleteData: $deleteData) {
    id
  }}`;

export const removeAspectVariables = (id: string) => `
{
  "deleteData": {
    "ID": ${id}
  }
}`;

export const removeActorMutation = `
mutation deleteActor($deleteData: DeleteActorInput!) {
  deleteActor(deleteData: $deleteData)
  {id}}`;

export const removeActorVariables = (id: string) => `
{
  "deleteData": {
    "ID": ${id}
  }
}`;

export const removeActorGroupMutation = `
mutation deleteActorGroup($deleteData: DeleteActorGroupInput!) {
  deleteActorGroup(deleteData: $deleteData) {
    id
  }}`;

export const removeActorGroupVariables = (id: string) => `
{
  "deleteData": {
    "ID": ${id}
  }
}`;

const mutations: Record<string, string> = {
  removeAspectMutation,
  removeActorMutation,
  removeActorGroupMutation,
  removeOpportunityMutation,
  removeChallengeMutation,
  removeUserMutation,
};

const variables: Record<string, (id: string) => string> = {
  removeAspectVariables,
  removeActorVariables,
  removeActorGroupVariables,
  removeOpportunityVariables,
  removeChallengeVariables,
  removeUserVariables,
};

export const getRemoveMutation = (name: string) => {
  return mutations[name];
};

export const getRemoveVariables = (name: string, id: string) => {
  return variables[name](id);
};
