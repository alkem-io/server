import { TestUser } from '../../../utils/token.helper';
import { graphqlRequestAuth } from '../../../utils/graphql.request';

export const createReferenceOnContextMutation = async (
  contextId: any,
  refName: string,
  refUri?: string,
  refDescription?: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createReferenceOnContext($referenceInput: ReferenceInput!, $contextID: Float!) {
      createReferenceOnContext(referenceInput: $referenceInput, contextID: $contextID) {
        id
        name,
        uri,
        description
      }
    }`,
    variables: {
      contextID: parseFloat(contextId),
      referenceInput: {
        name: `${refName}`,
        uri: `${refUri}`,
        description: `${refDescription}`,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
