import { getUserMemberships, getUsers } from './user.request.params';
import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
});

afterAll(async () => {
  if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
});

describe('Query all users', () => {
  it('should get users', async () => {
    const response = await getUsers();
    expect(response.status).toBe(200);
    expect(response.body.data.users).toContainObject({
      displayName: 'admin cherrytwist',
    });
  });

  test('should get memberships', async () => {
    const response = await getUserMemberships();

    expect(response.status).toBe(200);
  });
});
