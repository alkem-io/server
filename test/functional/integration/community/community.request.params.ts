import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

const uniqueId = (Date.now() + Math.random()).toString();

export const createGroupOnCommunityMutation = async (
  communityId: any,
  groupNameText: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createGroupOnCommuity($groupName: String!, $communityID: Float!) {
      createGroupOnCommunity(groupName: $groupName, communityID: $communityID) {
        name,
        id
        members {
          name
        }
      }
    }`,
    variables: {
      groupName: groupNameText,
      communityID: parseFloat(communityId),
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
