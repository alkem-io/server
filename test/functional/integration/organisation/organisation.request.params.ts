import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { organisationData } from '@test/utils/common-params';

export const createOrganisationMutation = async (
  organisationName: string,
  textId: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation CreateOrganisation($organisationData: CreateOrganisationInput!) {
      createOrganisation(organisationData: $organisationData) ${organisationData}
    }`,
    variables: {
      organisationData: {
        displayName: organisationName,
        nameID: textId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
