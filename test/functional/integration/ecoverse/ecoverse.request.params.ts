import { challengeDataTest } from "@test/utils/common-params";
import { graphqlRequestAuth } from "@test/utils/graphql.request";
import { TestUser } from "@test/utils/token.helper";

export const getEcoverseData = async (ecoverseId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{ecoverse {challenge (ID: "${ecoverseId}") {
      ${challengeDataTest}
      }
    }
  }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};