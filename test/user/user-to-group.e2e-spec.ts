import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  addUserToGroup,
  createUserDetailsMutation,
  removeUserFromGroup,
  removeUserMutation,
} from './user.request.params';
import { AppModule } from '../../src/app.module';
import { graphqlRequest } from '../utils/graphql.request';
import '../utils/array.matcher';
import { createGroupMutation } from '../group/group.request.params';

let userName = '';
let userId = '';
let userPhone = '';
let userEmail = '';
let groupName = '';

beforeEach(() => {
  userName = 'testUser ' + Math.random().toString();
  userPhone = 'userPhone ' + Math.random().toString();
  userEmail = Math.random().toString() + '@test.com';
});
let app: INestApplication;

beforeAll(async () => {
  const testModule: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = testModule.createNestApplication();
  await app.init();
});

afterAll(async () => {
  await app.close();
});

describe('Users and Groups', () => {
  beforeEach(() => {
    groupName = 'groupName ' + Math.random().toString();
  });

  afterEach(async () => {
    await removeUserMutation(userId, app);
  });

  test('should add "user" to "group"', async () => {
    // Arrange
    const responseCreate = await createGroupMutation(groupName, app);
    const groupId = responseCreate.body.data.createGroupOnEcoverse.id;

    const responseCreateUser = await createUserDetailsMutation(
      userName,
      userPhone,
      userEmail,
      app
    );
    userId = responseCreateUser.body.data.createUser.id;

    // Act
    const responseAddUserToGroup = await addUserToGroup(userId, groupId, app);

    // Assert
    expect(responseAddUserToGroup.status).toBe(200);
    expect(responseAddUserToGroup.body.data.addUserToGroup).toEqual(true);
  });

  test('should throw error whem add same "user", twice to same "group"', async () => {
    // Arrange
    const responseCreate = await createGroupMutation(groupName, app);
    const groupId = responseCreate.body.data.createGroupOnEcoverse.id;

    const responseCreateUser = await createUserDetailsMutation(
      userName,
      userPhone,
      userEmail,
      app
    );
    userId = responseCreateUser.body.data.createUser.id;

    // Act
    await addUserToGroup(userId, groupId, app);
    const responseAddSameUserToGroup = await addUserToGroup(
      userId,
      groupId,
      app
    );

    // Assert
    expect(responseAddSameUserToGroup.status).toBe(200);
    expect(responseAddSameUserToGroup.body.data.addUserToGroup).toEqual(false);
  });

  test('should add same "user" to 2 different "groups"', async () => {
    // Arrange
    const testGroupOne = 'testGroup1';
    const testGroupTwo = 'testGroup2';

    const responseCreateGroupOne = await createGroupMutation(testGroupOne, app);
    const groupIdOne =
      responseCreateGroupOne.body.data.createGroupOnEcoverse.id;

    const responseCreateGroupTwo = await createGroupMutation(testGroupTwo, app);
    const groupIdTwo =
      responseCreateGroupTwo.body.data.createGroupOnEcoverse.id;

    const responseCreateUser = await createUserDetailsMutation(
      userName,
      userPhone,
      userEmail,
      app
    );
    userId = responseCreateUser.body.data.createUser.id;

    // Act
    const responseAddUserToGroupOne = await addUserToGroup(
      userId,
      groupIdOne,
      app
    );

    const responseAddUserToGroupTwo = await addUserToGroup(
      userId,
      groupIdTwo,
      app
    );

    // Assert
    expect(responseAddUserToGroupOne.status).toBe(200);
    expect(responseAddUserToGroupOne.body.data.addUserToGroup).toEqual(true);

    expect(responseAddUserToGroupTwo.status).toBe(200);
    expect(responseAddUserToGroupTwo.body.data.addUserToGroup).toEqual(true);
  });

  test.skip('should remove "user" from a "group"', async () => {
    // Arrange
    const responseCreate = await createGroupMutation(groupName, app);
    const groupId = responseCreate.body.data.createGroupOnEcoverse.id;

    const responseCreateUser = await createUserDetailsMutation(
      userName,
      userPhone,
      userEmail,
      app
    );
    userId = responseCreateUser.body.data.createUser.id;

    await addUserToGroup(userId, groupId, app);

    // Act
    const responseRemoveUserFromGroup = await removeUserFromGroup(
      userId,
      groupId,
      app
    );

    // Assert
    expect(responseRemoveUserFromGroup.status).toBe(200);
    expect(responseRemoveUserFromGroup.body.data.removeUserFromGroup).toEqual(
      true
    );
    expect(
      responseRemoveUserFromGroup.body.data.removeUserFromGroup.members
    ).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: userId })])
    );
  });

  test('should remove/delete a "user" after added in a "group"', async () => {
    // Arrange
    const responseCreate = await createGroupMutation(groupName, app);
    const groupId = responseCreate.body.data.createGroupOnEcoverse.id;

    const responseCreateUser = await createUserDetailsMutation(
      userName,
      userPhone,
      userEmail,
      app
    );
    userId = responseCreateUser.body.data.createUser.id;

    await addUserToGroup(userId, groupId, app);

    // Act
    const responseRemoveUser = await removeUserMutation(userId, app);

    const responseQueryGroups = await graphqlRequest(
      {
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
      },
      app
    );

    // Assert
    expect(responseRemoveUser.status).toBe(200);
    expect(responseRemoveUser.body.data.removeUser).toBe(true);
    expect(responseQueryGroups.body.data.groups).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: userId })])
    );
  });
});
