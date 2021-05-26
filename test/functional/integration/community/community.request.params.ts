import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

const uniqueId = (Date.now() + Math.random()).toString();

export const createGroupOnCommunityMutation = async (
  communityId: any,
  groupNameText: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createGroupOnCommunity($groupData: CreateUserGroupInput!) {
      createGroupOnCommunity(groupData: $groupData) {
        name,
        id
        members {
          name
        }
        profile{
          id
        }
      }
    }`,
    variables: {
      groupData: {
        name: groupNameText,
        parentID: communityId,
        profileData: {
          description: 'some description',
          avatar: 'http://someUri',
        },
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
