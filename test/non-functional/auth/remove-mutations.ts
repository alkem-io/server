export const removeUserMutation = `
mutation removeUser($userID: Float!) {
    removeUser(userID: $userID)
  }`;

export const removeUserVariables = (id: number) => `
{
    "userID": ${id}
  }`;

export const removeChallengeMutation = `
mutation removeChallenge($ID: Float!) {
    removeChallenge(ID: $ID)
  }`;

export const removeChallengeVariables = (id: number) => `
{
    "ID": ${id}
  }`;

export const removeOpportunityMutation = `
  mutation removeOpportunity($ID: Float!) {
    removeOpportunity(ID: $ID)
    }`;

export const removeOpportunityVariables = (id: number) => `
  {
      "ID": ${id}
    }`;

export const removeAspectMutation = `
mutation removeAspect($ID: Float!) {
    removeAspect(ID: $ID)
  }`;

export const removeAspectVariables = (id: number) => `
  {
    "ID": ${id}
  }`;

export const removeActorMutation = `
mutation removeActor($ID: Float!) {
    removeActor(ID: $ID)
  }`;

export const removeActorVariables = (id: number) => `
{
    "ID": ${id}
  }`;

export const removeActorGroupMutation = `
mutation removeActorGroup($ID: Float!) {
    removeActorGroup(ID: $ID)
  }`;

export const removeActorGroupVariables = (id: number) => `
  {
      "ID": ${id}
    }`;

const mutations: Record<string, string> = {
  removeAspectMutation,
  removeActorMutation,
  removeActorGroupMutation,
  removeOpportunityMutation,
  removeChallengeMutation,
  removeUserMutation,
};

const variables: Record<string, (id: number) => string> = {
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

export const getRemoveVariables = (name: string, id: number) => {
  return variables[name](id);
};
