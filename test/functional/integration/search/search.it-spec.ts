import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';
import { createOrganisationMutation } from '../organisation/organisation.request.params';
import { searchMutation } from '../search/search.request.params';
import { getUser } from '@test/functional/e2e/user-management/user.request.params';

const userNameID = 'Qa_User';
const userName = 'Qa User';
let organisationName = '';
let organisationId = '';
let uniqueTextId = '';
const typeFilterAll = ['user', 'organisation'];
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
const userId = async (): Promise<string> => {
  const getUserId = await getUser(userNameID);
  const response = getUserId.body.data.user.id;
  return response;
};
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
  organisationName = `QA organisationName ${uniqueTextId}`;

  // Create organisation
  const responseCreateOrganisation = await createOrganisationMutation(
    organisationName,
    'org' + uniqueTextId
  );
  organisationId = responseCreateOrganisation.body.data.createOrganisation.id;
});

describe('Query Challenge data', () => {
  test('should search with all filters applied', async () => {
    // Act
    const responseSearchData = await searchMutation(termAll, typeFilterAll);
    // Assert
    expect(responseSearchData.body.data.search).toContainObject({
      terms: termAll,
      score: 10,
      result: {
        __typename: 'User',
        id: `${await userId()}`,
        displayName: `${userName}`,
      },
    });

    expect(responseSearchData.body.data.search).toContainObject({
      terms: termAll,
      score: 10,
      result: {
        __typename: 'Organisation',
        id: `${organisationId}`,
        displayName: `${organisationName}`,
      },
    });
  });

  test('should search without filters', async () => {
    // Act
    const responseSearchData = await searchMutation(filterNo, typeFilterAll);

    // Assert

    expect(responseSearchData.body.data.search).toEqual([]);
  });

  test('should search only for filtered users', async () => {
    // Act
    const responseSearchData = await searchMutation(termAll, filterOnlyUser);

    // Assert
    expect(responseSearchData.body.data.search).toContainObject({
      terms: termAll,
      score: 10,
      result: {
        __typename: 'User',
        id: `${await userId()}`,
        displayName: `${userName}`,
      },
    });

    expect(responseSearchData.body.data.search).not.toContainObject({
      terms: termAll,
      score: 10,
      result: {
        __typename: 'Organisation',
        id: `${organisationId}`,
        displayName: `${organisationName}`,
      },
    });
  });

  test('should search users triple score', async () => {
    // Act
    const responseSearchData = await searchMutation(
      termAllScored,
      typeFilterAll
    );

    // Assert
    expect(responseSearchData.body.data.search).toContainObject({
      terms: ['QA', 'user'],
      score: 30,
      result: {
        __typename: 'User',
        id: `${await userId()}`,
        displayName: `${userName}`,
      },
    });

    expect(responseSearchData.body.data.search).toContainObject({
      terms: ['QA'],
      score: 20,
      result: {
        __typename: 'Organisation',
        id: `${organisationId}`,
        displayName: `${organisationName}`,
      },
    });
  });

  test('should search term users only', async () => {
    // Act
    const responseSearchData = await searchMutation(
      termUserOnly,
      typeFilterAll
    );

    // Assert
    expect(responseSearchData.body.data.search).toContainObject({
      terms: termUserOnly,
      score: 10,
      result: {
        __typename: 'User',
        id: `${await userId()}`,
        displayName: `${userName}`,
      },
    });

    expect(responseSearchData.body.data.search).not.toContainObject({
      terms: termUserOnly,
      score: 10,
      result: {
        __typename: 'Organisation',
        id: `${organisationId}`,
        displayName: `${organisationName}`,
      },
    });
  });

  test('should throw limit error for too many terms', async () => {
    // Act
    const responseSearchData = await searchMutation(termTooLong, typeFilterAll);

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

  test('should throw error for empty string search', async () => {
    // Act
    const responseSearchData = await searchMutation(' ', typeFilterAll);

    // Assert

    expect(responseSearchData.text).toContain(
      'Search: Skipping term below minimum length: '
    );
  });

  test('should not return any results for invalid term', async () => {
    // Act
    const responseSearchData = await searchMutation(
      termNotExisting,
      typeFilterAll
    );

    // Assert
    expect(responseSearchData.body.data.search).toEqual([]);
  });
});
