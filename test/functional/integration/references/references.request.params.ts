import { TestUser } from '../../../utils/token.helper';
import { graphqlRequestAuth } from '../../../utils/graphql.request';
import { referencesData } from '@test/utils/common-params';

export const createReferenceOnContextMutation = async (
  contextId: any,
  refName: string,
  refUri?: string,
  refDescription?: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createReferenceOnContext($referenceInput: CreateReferenceInput!) {
      createReferenceOnContext(referenceInput: $referenceInput) {
        ${referencesData}
      }
    }`,
    variables: {
      referenceInput: {
        parentID: contextId,
        name: `${refName}`,
        uri: `${refUri}`,
        description: `${refDescription}`,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
