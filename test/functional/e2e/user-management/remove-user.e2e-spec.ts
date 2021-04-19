import {
  createUserMutation,
  getUsersProfile,
  removeUserMutation,
} from './user.request.params';
import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';

let userName = '';
let userId = '';
let userPhone = '';
let userEmail = '';
let uniqueId = '';
let userData;

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
});

afterAll(async () => {
  if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
});

beforeEach(async () => {
  uniqueId = Math.random()
    .toString(12)
    .slice(-6);
  userName = `testUser${uniqueId}`;
  userPhone = `userPhone ${uniqueId}`;
  userEmail = `${uniqueId}@test.com`;

  const response = await createUserMutation(userName);
  userId = response.body.data.createUser.id;
});

describe('Remove user', () => {
  test('should remove created user', async () => {
    // Act
    const responseQuery = await removeUserMutation(userId);

    // Assert
    expect(responseQuery.status).toBe(200);
    expect(responseQuery.body.data.deleteUser.name).toEqual(userName);
  });

  test('should receive a message for removing already removed user', async () => {
    // Arrange
    await removeUserMutation(userId);

    // Act
    const responseQuery = await removeUserMutation(userId);

    // Assert
    expect(responseQuery.status).toBe(200);
    expect(responseQuery.text).toContain(
      `Unable to find user with given ID: ${userId}`
    );
  });

  test('should receive a message for removing unexisting user', async () => {
    // Act
    const responseQuery = await removeUserMutation(77777);

    // Assert
    expect(responseQuery.status).toBe(200);
    expect(responseQuery.text).toContain(
      'Unable to find user with given ID: 77777'
    );
  });

  test('should not get result for quering removed user', async () => {
    // Arrange
    await removeUserMutation(userId);

    // Act
    userData = await getUsersProfile(userId);

    // Assert
    expect(userData.status).toBe(200);
    expect(userData.text).toContain(
      `Unable to find user with given ID: ${userId}`
    );
  });
});
