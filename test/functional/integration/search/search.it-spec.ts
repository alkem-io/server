import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';
import {
  createChallangeMutation,
  removeChallangeMutation,
} from '@test/functional/integration/challenge/challenge.request.params';
import { createOrganisationMutation } from '../organisation/organisation.request.params';
import {
  createGroupMutation,
  removeUserGroupMutation,
} from '../group/group.request.params';
import { searchMutation } from '../search/search.request.params';
import {
  createUserMutation,
  removeUserMutation,
} from '@test/functional/e2e/user-management/user.request.params';

let userName = '';
let userId = '';
let groupName = '';
let ecoverseGroupId = '';
let organisationName = '';
let organisationId = '';
let uniqueTextId = '';
const filterAll = ['user', 'group', 'organisation'];
const filterOnlyUser = ['user'];
const filterNo: never[] = [];
const termUserOnly = ['User'];
const termAll = ['QA'];
const termNotExisting = ['notexisting'];
const termTooLong = [
  'QA',
  'User',
  'QA',
  'User',
  'QA',
  'User',
  'QA',
  'User',
  'QA',
  'User',
  'QA',
];
const termAllScored = ['QA', 'QA', 'user', 'mm'];

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
});

afterAll(async () => {
  if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
});

beforeEach(async () => {
  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  userName = `QAuserName${uniqueTextId}`;
  groupName = `QA groupName ${uniqueTextId}`;
  organisationName = `QA organisationName ${uniqueTextId}`;

  // Create user
  const response = await createUserMutation(userName);
  userId = response.body.data.createUser.id;

  // Create organisation
  const responseCreateOrganisation = await createOrganisationMutation(
    organisationName
  );
  organisationId = responseCreateOrganisation.body.data.createOrganisation.id;

  // Create ecoverse group
  const responseCreateGroupOnEcoverse = await createGroupMutation(groupName);
  ecoverseGroupId =
    responseCreateGroupOnEcoverse.body.data.createGroupOnEcoverse.id;
});

describe('Query Challenge data', () => {
  afterEach(async () => {
    await removeUserMutation(userId);
    await removeUserGroupMutation(ecoverseGroupId);
  });
  test('should search with all filters applied', async () => {
    // Act
    const responseSearchData = await searchMutation(termAll, filterAll);

    // Assert
    expect(responseSearchData.body.data.search).toContainObject({
      terms: termAll,
      score: 10,
      result: { __typename: 'User', name: `${userName}`, id: `${userId}` },
    });

    expect(responseSearchData.body.data.search).toContainObject({
      terms: termAll,
      score: 10,
      result: {
        __typename: 'UserGroup',
        name: `${groupName}`,
        id: `${ecoverseGroupId}`,
      },
    });
    expect(responseSearchData.body.data.search).toContainObject({
      terms: termAll,
      score: 10,
      result: {
        __typename: 'Organisation',
        name: `${organisationName}`,
        id: `${organisationId}`,
      },
    });
  });

  test('should search without filters', async () => {
    // Act
    const responseSearchData = await searchMutation(termAll, filterNo);

    // Assert
    expect(responseSearchData.body.data.search).toContainObject({
      terms: termAll,
      score: 10,
      result: { __typename: 'User', name: `${userName}`, id: `${userId}` },
    });

    expect(responseSearchData.body.data.search).toContainObject({
      terms: termAll,
      score: 10,
      result: {
        __typename: 'UserGroup',
        name: `${groupName}`,
        id: `${ecoverseGroupId}`,
      },
    });
    expect(responseSearchData.body.data.search).toContainObject({
      terms: termAll,
      score: 10,
      result: {
        __typename: 'Organisation',
        name: `${organisationName}`,
        id: `${organisationId}`,
      },
    });
  });

  test('should search only for filtered users', async () => {
    // Act
    const responseSearchData = await searchMutation(termAll, filterOnlyUser);

    // Assert
    expect(responseSearchData.body.data.search).toContainObject({
      terms: termAll,
      score: 10,
      result: { __typename: 'User', name: `${userName}`, id: `${userId}` },
    });

    expect(responseSearchData.body.data.search).not.toContainObject({
      terms: termAll,
      score: 10,
      result: {
        __typename: 'UserGroup',
        name: `${groupName}`,
        id: `${ecoverseGroupId}`,
      },
    });
    expect(responseSearchData.body.data.search).not.toContainObject({
      terms: termAll,
      score: 10,
      result: {
        __typename: 'Organisation',
        name: `${organisationName}`,
        id: `${organisationId}`,
      },
    });
  });

  test('should search users triple score', async () => {
    // Act
    const responseSearchData = await searchMutation(termAllScored, filterAll);

    // Assert
    expect(responseSearchData.body.data.search).toContainObject({
      terms: ['QA', 'user'],
      score: 30,
      result: { __typename: 'User', name: `${userName}`, id: `${userId}` },
    });

    expect(responseSearchData.body.data.search).toContainObject({
      terms: ['QA'],
      score: 20,
      result: {
        __typename: 'UserGroup',
        name: `${groupName}`,
        id: `${ecoverseGroupId}`,
      },
    });
    expect(responseSearchData.body.data.search).toContainObject({
      terms: ['QA'],
      score: 20,
      result: {
        __typename: 'Organisation',
        name: `${organisationName}`,
        id: `${organisationId}`,
      },
    });
  });

  test('should search term users only', async () => {
    // Act
    const responseSearchData = await searchMutation(termUserOnly, filterAll);

    // Assert
    expect(responseSearchData.body.data.search).toContainObject({
      terms: termUserOnly,
      score: 10,
      result: { __typename: 'User', name: `${userName}`, id: `${userId}` },
    });

    expect(responseSearchData.body.data.search).not.toContainObject({
      terms: termUserOnly,
      score: 10,
      result: {
        __typename: 'UserGroup',
        name: `${groupName}`,
        id: `${ecoverseGroupId}`,
      },
    });
    expect(responseSearchData.body.data.search).not.toContainObject({
      terms: termUserOnly,
      score: 10,
      result: {
        __typename: 'Organisation',
        name: `${organisationName}`,
        id: `${organisationId}`,
      },
    });
  });

  test('should throw error for too terms limit', async () => {
    // Act
    const responseSearchData = await searchMutation(termTooLong, filterAll);

    // Assert
    expect(responseSearchData.text).toContain(
      'Maximum number of search terms is 10; supplied: 11'
    );
  });

  test('should throw error for invalid filter', async () => {
    // Act
    const responseSearchData = await searchMutation(termAll, 'invalid');

    // Assert
    expect(responseSearchData.text).toContain(
      'Not allowed typeFilter encountered: invalid'
    );
  });

  test.skip('should not return any results for for empty string', async () => {
    // Act
    const responseSearchData = await searchMutation(' ', filterAll);

    // Assert
    expect(responseSearchData.body.data.search).toEqual([]);
  });

  test('should not return any results for invalid term', async () => {
    // Act
    const responseSearchData = await searchMutation(termNotExisting, filterAll);

    // Assert
    expect(responseSearchData.body.data.search).toEqual([]);
  });
});
