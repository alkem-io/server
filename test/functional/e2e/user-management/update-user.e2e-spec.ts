import {
  createUserDetailsMutation,
  getUpdatedUserData,
  getUsers,
  removeUserMutation,
  updateUserMutation,
} from './user.request.params';
import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';

let userName = '';
let userFirstName = '';
let userLastName = '';
let userId = '';
let userPhone = '';
let userEmail = '';

let userNameAfterUpdate = '';
let phoneAfterUpdate = '';
let emailAfterUpdate = '';
let getUserData;
let userDataCreate: any;
let uniqueId = '';

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
});

afterAll(async () => {
  if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
});

describe.skip('Update user', () => {
  beforeEach(async () => {
    uniqueId = Math.random()
      .toString(12)
      .slice(-6);
    userName = `testUser${uniqueId}`;
    userFirstName = `userFirstName${uniqueId}`;
    userLastName = `userLastName${uniqueId}`;
    userPhone = `userPhone ${uniqueId}`;
    userEmail = `${userName}@test.com`;
    userNameAfterUpdate = `updateName${uniqueId}`;
    phoneAfterUpdate = `updatePhone${uniqueId}`;
    emailAfterUpdate = `updateEmail${uniqueId}@test.com`;
    const responseCreateUser = await createUserDetailsMutation(
      userName,
      userFirstName,
      userLastName,
      userPhone,
      userEmail
    );
    userId = responseCreateUser.body.data.createUser.id;
    userDataCreate = responseCreateUser.body.data.createUser;
  });

  afterEach(async () => {
    await removeUserMutation(userId);
  });

  test('should update user "name" only', async () => {
    // Act
    const responseUpdateUser = await updateUserMutation(
      userId,
      userNameAfterUpdate,
      userPhone
    );
    getUserData = await getUpdatedUserData(userId);

    // Assert
    expect(responseUpdateUser.status).toBe(200);
    expect(userDataCreate).not.toEqual(responseUpdateUser.body.data.updateUser);
    expect(getUserData.body.data.user).toEqual(
      responseUpdateUser.body.data.updateUser
    );
  });

  test('should update user "phone" only', async () => {
    // Act
    const responseUpdateUser = await updateUserMutation(
      userId,
      userName,
      phoneAfterUpdate
    );
    getUserData = await getUpdatedUserData(userId);

    // Assert
    expect(responseUpdateUser.status).toBe(200);
    expect(userDataCreate).not.toEqual(responseUpdateUser.body.data.updateUser);
    expect(getUserData.body.data.user).toEqual(
      responseUpdateUser.body.data.updateUser
    );
  });

  test('should update user and be available in "users" query', async () => {
    // Act
    const test = await updateUserMutation(
      userId,
      userNameAfterUpdate,
      userPhone
    );
    let getUsersData = await getUsers();

    // Assert
    expect(getUsersData.body.data.users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: userEmail,
          id: userId,
          name: userNameAfterUpdate,
          phone: userPhone,
        }),
      ])
    );
  });
});
