import {
  addUserToGroup,
  assignGroupFocalPointMutation,
  createUserDetailsMutation,
  removeUserFromGroup,
  removeUserMutation,
} from './user.request.params';
import { graphqlRequest } from '@test/utils/graphql.request';
import '@test/utils/array.matcher';
import { createGroupMutation } from '@test/functional/integration/group/group.request.params';
import { appSingleton } from '@test/utils/app.singleton';

let userName = '';
let userId = '';
let userPhone = '';
let userEmail = '';
let groupName = '';

const uniqueId = Math.random().toString();

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
});

afterAll(async () => {
  if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
});

beforeEach(() => {
  userName = `testUser ${uniqueId}`;
  userPhone = `userPhone ${uniqueId}`;
  userEmail = `${uniqueId}@test.com`;
});

describe.skip('Users and Groups', () => {
  beforeEach(() => {
    groupName = 'groupName ' + Math.random().toString();
  });

  afterEach(async () => {
    await removeUserMutation(userId);
  });

  test('should add "user" to "group"', async () => {
    // Arrange
    const responseCreate = await createGroupMutation(groupName);
    const groupId = responseCreate.body.data.createGroupOnEcoverse.id;

    const responseCreateUser = await createUserDetailsMutation(
      userName,
      userPhone,
      userEmail
    );
    userId = responseCreateUser.body.data.createUser.id;

    // Act
    const responseAddUserToGroup = await addUserToGroup(userId, groupId);

    // Assert
    expect(responseAddUserToGroup.status).toBe(200);
    expect(responseAddUserToGroup.body.data.addUserToGroup).toEqual(true);
  });

  test('should throw error whem add same "user", twice to same "group"', async () => {
    // Arrange
    const responseCreate = await createGroupMutation(groupName);
    const groupId = responseCreate.body.data.createGroupOnEcoverse.id;

    const responseCreateUser = await createUserDetailsMutation(
      userName,
      userPhone,
      userEmail
    );
    userId = responseCreateUser.body.data.createUser.id;

    // Act
    await addUserToGroup(userId, groupId);
    const responseAddSameUserToGroup = await addUserToGroup(userId, groupId);

    // Assert
    expect(responseAddSameUserToGroup.status).toBe(200);
    expect(responseAddSameUserToGroup.body.data.addUserToGroup).toEqual(false);
  });

  test('should add same "user" to 2 different "groups"', async () => {
    // Arrange
    const testGroupOne = 'testGroup1';
    const testGroupTwo = 'testGroup2';

    const responseCreateGroupOne = await createGroupMutation(testGroupOne);
    const groupIdOne =
      responseCreateGroupOne.body.data.createGroupOnEcoverse.id;

    const responseCreateGroupTwo = await createGroupMutation(testGroupTwo);
    const groupIdTwo =
      responseCreateGroupTwo.body.data.createGroupOnEcoverse.id;

    const responseCreateUser = await createUserDetailsMutation(
      userName,
      userPhone,
      userEmail
    );
    userId = responseCreateUser.body.data.createUser.id;

    // Act
    const responseAddUserToGroupOne = await addUserToGroup(userId, groupIdOne);

    const responseAddUserToGroupTwo = await addUserToGroup(userId, groupIdTwo);

    // Assert
    expect(responseAddUserToGroupOne.status).toBe(200);
    expect(responseAddUserToGroupOne.body.data.addUserToGroup).toEqual(true);

    expect(responseAddUserToGroupTwo.status).toBe(200);
    expect(responseAddUserToGroupTwo.body.data.addUserToGroup).toEqual(true);
  });

  test('should remove "user" from a "group"', async () => {
    // Arrange
    const responseCreate = await createGroupMutation(groupName);
    const groupId = responseCreate.body.data.createGroupOnEcoverse.id;

    const responseCreateUser = await createUserDetailsMutation(
      userName,
      userPhone,
      userEmail
    );
    userId = responseCreateUser.body.data.createUser.id;

    await addUserToGroup(userId, groupId);

    // Act
    const responseRemoveUserFromGroup = await removeUserFromGroup(
      userId,
      groupId
    );

    // Assert
    expect(responseRemoveUserFromGroup.status).toBe(200);
    expect(responseRemoveUserFromGroup.body.data.removeUserFromGroup).toEqual(
      expect.objectContaining({
        name: groupName,
        members: [],
        id: groupId,
      })
    );
    expect(
      responseRemoveUserFromGroup.body.data.removeUserFromGroup.members
    ).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: userId })])
    );
  });

  test('should remove/delete a "user" after added in a "group"', async () => {
    // Arrange
    const responseCreate = await createGroupMutation(groupName);
    const groupId = responseCreate.body.data.createGroupOnEcoverse.id;

    const responseCreateUser = await createUserDetailsMutation(
      userName,
      userPhone,
      userEmail
    );
    userId = responseCreateUser.body.data.createUser.id;

    await addUserToGroup(userId, groupId);

    // Act
    const responseRemoveUser = await removeUserMutation(userId);

    const responseQueryGroups = await graphqlRequest({
      query: `{
          groups{
            name,
            id,
            members{
              name,
              id
            }
          }
        }`,
    });

    // Assert
    expect(responseRemoveUser.status).toBe(200);
    expect(responseRemoveUser.body.data.removeUser).toBe(true);
    expect(responseQueryGroups.body.data.groups).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: userId })])
    );
  });

  test('should add "user" to "group" as focal point', async () => {
    // Arrange
    const responseCreate = await createGroupMutation(groupName);
    const groupId = responseCreate.body.data.createGroupOnEcoverse.id;

    const responseCreateUser = await createUserDetailsMutation(
      userName,
      userPhone,
      userEmail
    );
    userId = responseCreateUser.body.data.createUser.id;

    // Act
    const responseAddUserToGroup = await assignGroupFocalPointMutation(
      userId,
      groupId
    );

    // Assert
    expect(responseAddUserToGroup.status).toBe(200);
    expect(
      responseAddUserToGroup.body.data.assignGroupFocalPoint.focalPoint.name
    ).toEqual(userName);
  });
});
