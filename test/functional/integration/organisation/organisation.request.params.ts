import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

export const createOrganisationMutation = async (
  organisationName: string,
  textId: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation CreateOrganisation($organisationData: OrganisationInput!) {
      createOrganisation(organisationData: $organisationData) {
        id
        name,
        members
        {
           name
        }
      }
    }`,
    variables: {
      organisationData: {
        name: organisationName,
        textID: textId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
