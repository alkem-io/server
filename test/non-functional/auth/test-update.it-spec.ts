import { TestUser } from '@test/utils/token.helper';
import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';

import {
  updateChallengeMutation,
  updateChallengeVariables,
} from '@test/utils/update-mutations';

import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { TestDataServiceInitResult } from '@utils/data-management/test-data.service';

const notAuthorizedCode = '"code":"FORBIDDEN"';

let data: TestDataServiceInitResult;

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
  data = appSingleton.Instance.getData();
});

afterAll(async () => {
  if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
});

describe('DDT ecoverse member user - Update mutations - NOT authorized', () => {
  // Arrange
  test.each`
    mutation                   | variables                                     | expected
    ${updateChallengeMutation} | ${updateChallengeVariables(data.challengeId)} | ${notAuthorizedCode}
  `(
    "should expect: '$expected' for update mutation: '$mutation' and variables: '$variables'",
    async ({ mutation, variables, expected }) => {
      // Act
      const requestParamsUpdateMutations = {
        operationName: null,
        query: `${mutation}`,
        variables: `${variables}`,
      };
      const response = await graphqlRequestAuth(
        requestParamsUpdateMutations,
        TestUser.ECOVERSE_ADMIN
      );
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).not.toContain(expected);
    }
  );
});
