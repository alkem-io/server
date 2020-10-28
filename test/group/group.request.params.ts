import { INestApplication } from '@nestjs/common';
import { graphqlRequest } from '../utils/graphql.request';

export const createGroupMutation = async (
  testGroup: string,
  app: INestApplication
) => {
  const requestParams = {
    operationName: 'CreateGroupOnEcoverse',
    query: `mutation CreateGroupOnEcoverse($groupName: String!) {
        createGroupOnEcoverse(groupName: $groupName) {
          name,
          id,
        }
      }`,
    variables: {
      groupName: testGroup,
    },
  };

  return await graphqlRequest(requestParams, app);
};
