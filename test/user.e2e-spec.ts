import { createGroupMutation } from './helpers/group';
import { graphqlRequest } from './helpers/helpers';
import {
  addUserToGroup,
  createUserDetailsMutation,
  createUserMutation,
  removeUserFromGroup,
  removeUserMutation,
  updateUserMutation,
} from './helpers/user';

let userName = '';
let userId = '';
let userPhone = '';
let userEmail = '';
let groupName = '';

let userNameAfterUpdate = '';
let phoneAfterUpdate = '';
let emailAfterUpdate = '';

beforeEach(() => {
  userName = 'testUser ' + Math.random().toString();
  userPhone = 'userPhone ' + Math.random().toString();
  userEmail = Math.random().toString() + '@test.com';
});

describe('Create User', () => {
  afterEach(async () => {
    await removeUserMutation(userId);
  });

  test('should create a user', async () => {
    // Act
    const response = await createUserMutation(userName, userEmail);
    userId = response.body.data.createUser.id;

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data.createUser.name).toEqual(userName);
  });

  test.skip('should throw error - same user is created twice', async () => {
    // Arrange
    const response = await createUserMutation(userName, userEmail);
    userId = response.body.data.createUser.id;
    console.log('userid1: ' + userId);
    console.log(response.body);
    // Act
    const responseSecondTime = await createUserMutation(userName, userEmail);
    const userId2 = responseSecondTime.body.data.createUser.id;
    console.log(responseSecondTime.body);

    console.log('userid2: ' + userId2);

    // Assert
    expect(responseSecondTime.status).toBe(200);
    expect(responseSecondTime.text).toContain('User "x" already exists!');
  });

  test('should query created user', async () => {
    // Arrange
    const response = await createUserMutation(userName, userEmail);
    userId = response.body.data.createUser.id;

    // Act
    const requestParamsQueryUser = {
      query: `{user(ID: "${userId}") { 
        name 
        id 
      }}`,
    };
    const responseQuery = await graphqlRequest(requestParamsQueryUser);

    // Assert
    expect(responseQuery.status).toBe(200);
    expect(responseQuery.body.data.user.name).toEqual(userName);
  });

  test('should query created user details', async () => {
    // Arrange
    const requestParams = {
      operationName: 'CreateUser',
      query: `mutation CreateUser($userData: UserInput!) {
        createUser(userData: $userData) {
          id
          name
          firstName
          lastName
          email
          phone
          city
          country
          gender
          profile {
            references {
              name
            }
          }
          memberof {
            email
          }
        }
      }`,
      variables: {
        userData: {
          name: 'test77',
          firstName: 'testFN',
          lastName: 'testLN',
          email: 'testEmail@test.com',
          phone: '092834',
          city: 'testCity',
          country: 'testCountry',
          gender: 'testGender',
        },
      },
    };

    const responseQuery = await graphqlRequest(requestParams);
    userId = responseQuery.body.data.createUser.id;
    // Act
    const requestParamsQueryUser = {
      query: `{user(ID: "${userId}")  
                {
                  name
                  firstName
                  lastName
                  email
                  phone
                  city
                  country
                  gender
                  profile {
                    references {
                      name
                    }
                  }
                  memberof {
                    email
                  }
                }
              }`,
    };
    const responseParamsQueryUser = await graphqlRequest(
      requestParamsQueryUser
    );

    // Assert
    expect(responseParamsQueryUser.status).toBe(200);
    expect(responseParamsQueryUser.body.data.user.name).toEqual('test77');
    expect(responseParamsQueryUser.body.data.user.firstName).toEqual('testFN');
    expect(responseParamsQueryUser.body.data.user.lastName).toEqual('testLN');
    expect(responseParamsQueryUser.body.data.user.email).toEqual(
      'testEmail@test.com'
    );
    expect(responseParamsQueryUser.body.data.user.phone).toEqual('092834');
    expect(responseParamsQueryUser.body.data.user.city).toEqual('testCity');
    expect(responseParamsQueryUser.body.data.user.country).toEqual(
      'testCountry'
    );
    expect(responseParamsQueryUser.body.data.user.gender).toEqual('testGender');
    expect(responseParamsQueryUser.body.data.user.profile).toEqual({
      references: [],
    });
    expect(responseParamsQueryUser.body.data.user.memberof).toEqual({
      email: 'testEmail@test.com',
    });
  });

  test('should throw error - create user with ID instead of name', async () => {
    // Arrange
    const requestParams = {
      operationName: 'CreateUser',
      query:
        'mutation CreateUser($userData: UserInput!) {createUser(ID: id) { id name }}',
      variables: {
        userData: {
          id: 12,
        },
      },
    };

    // Act
    const responseQuery = await graphqlRequest(requestParams);

    // Assert
    expect(responseQuery.status).toBe(400);
  });

  test('should throw error - create user with LONG NAME', async () => {
    const requestParams = {
      operationName: 'CreateUser',
      query:
        'mutation CreateUser($userData: UserInput!) {createUser(userData: $userData) { id name }}',
      variables: {
        userData: {
          name:
            'very loooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooong name',
          email: userEmail,
        },
      },
    };

    const responseQuery = await graphqlRequest(requestParams);

    // Assert
    expect(responseQuery.status).toBe(200);
    expect(responseQuery.text).toContain(
      "ER_DATA_TOO_LONG: Data too long for column 'name' at row 1"
    );
  });

  // Confirm the behaviour!!!!!
  test.skip('should throw error - create user without name', async () => {
    // Act
    const response = await createUserMutation('', userEmail);
    userId = response.body.data.createUser.id;

    // Assert
    expect(response.status).toBe(200);
    expect(response.text).toContain('Could not create user with without name');
  });

  test('should throw error - create user with invalid email', async () => {
    const requestParams = {
      operationName: 'CreateUser',
      query:
        'mutation CreateUser($userData: UserInput!) {createUser(userData: $userData) { id name }}',
      variables: {
        userData: {
          name: 'name',
          email: 'testEmail',
        },
      },
    };

    const responseQuery = await graphqlRequest(requestParams);
    // userId = responseQuery.body.data.createUser.id;

    // Assert
    expect(responseQuery.status).toBe(200);
    expect(responseQuery.text).toContain(
      'Valid email address required to create a user: testEmail'
    );
  });
});

describe('Remove user', () => {
  test('should remove created user', async () => {
    // Arrange
    const response = await createUserMutation(userName, userEmail);
    userId = response.body.data.createUser.id;

    // Act
    const responseQuery = await removeUserMutation(userId);

    // Assert
    expect(responseQuery.status).toBe(200);
    expect(responseQuery.body.data.removeUser).toBe(true);
  });

  test('should receive a message for removing already removed user', async () => {
    // Arrange
    const response = await createUserMutation(userName, userEmail);
    userId = response.body.data.createUser.id;
    await removeUserMutation(userId);

    // Act
    const responseQuery = await removeUserMutation(userId);

    // Assert
    expect(responseQuery.status).toBe(200);
    expect(responseQuery.text).toContain(
      `Could not locate specified user: ${userId}`
    );
  });

  test('should receive a message for removing unexisting user', async () => {
    // Act
    const responseQuery = await removeUserMutation(77777);

    // Assert
    expect(responseQuery.status).toBe(200);
    expect(responseQuery.text).toContain(
      'Could not locate specified user: 77777'
    );
  });

  test('should not get result for quering removed user', async () => {
    // Arrange
    const response = await createUserMutation(userName, userEmail);
    userId = response.body.data.createUser.id;
    await removeUserMutation(userId);

    // Act
    const requestParamsQueryUser = {
      query: `{user(ID: "${userId}") { 
        name 
        id 
      }}`,
    };
    const responseQueryResult = await graphqlRequest(requestParamsQueryUser);

    // Assert
    expect(responseQueryResult.status).toBe(200);
    expect(responseQueryResult.text).toContain(
      `Unable to locate user with given id: ${userId}`
    );
  });
});

describe('Update user', () => {
  beforeEach(() => {
    userNameAfterUpdate = 'testUserAfterUpdate-Name' + Math.random().toString();
    phoneAfterUpdate = 'testUserAfterUpdate-Phone' + Math.random().toString();
    emailAfterUpdate = 'testUserAfterUpdate-Email' + Math.random().toString();
  });

  afterEach(async () => {
    await removeUserMutation(userId);
  });

  test('should update user "name" only', async () => {
    // Arrange
    const responseCreateUser = await createUserDetailsMutation(
      userName,
      userPhone,
      userEmail
    );
    userId = responseCreateUser.body.data.createUser.id;

    // Act
    const responseUpdateUser = await updateUserMutation(
      userId,
      userNameAfterUpdate,
      userPhone
    );

    const requestParamsQueryUser = {
      query: `{user(ID: "${userId}") { 
        name 
        id
        email
        phone
      }}`,
    };
    const responseParamsQueryUser = await graphqlRequest(
      requestParamsQueryUser
    );

    // Assert
    expect(responseParamsQueryUser.status).toBe(200);
    expect(responseCreateUser.body.data.createUser).not.toEqual(
      responseUpdateUser.body.data.updateUser
    );
    expect(responseParamsQueryUser.body.data.user).toEqual(
      responseUpdateUser.body.data.updateUser
    );
  });

  test('should update user "phone" only', async () => {
    // Arrange
    const responseCreateUser = await createUserDetailsMutation(
      userName,
      userPhone,
      userEmail
    );
    userId = responseCreateUser.body.data.createUser.id;

    // Act
    const responseUpdateUser = await updateUserMutation(
      userId,
      userName,
      phoneAfterUpdate
    );

    const requestParamsQueryUser = {
      query: `{user(ID: "${userId}") { 
        name 
        id
        email
        phone
      }}`,
    };
    const responseParamsQueryUser = await graphqlRequest(
      requestParamsQueryUser
    );

    // Assert
    expect(responseParamsQueryUser.status).toBe(200);
    expect(responseCreateUser.body.data.createUser).not.toEqual(
      responseUpdateUser.body.data.updateUser
    );
    expect(responseParamsQueryUser.body.data.user).toEqual(
      responseUpdateUser.body.data.updateUser
    );
  });

  test('should throw message for updating user "email"', async () => {
    // Arrange
    const responseCreateUser = await createUserDetailsMutation(
      userName,
      userPhone,
      userEmail
    );
    userId = responseCreateUser.body.data.createUser.id;

    // Act
    const updateUserRequestParams = {
      operationName: 'UpdateUser',
      query: `mutation UpdateUser($userID: Float!, $userData: UserInput!) {
          updateUser(userID: $userID, userData: $userData) {
            id
            name
            phone
            email          
          }
        }`,
      variables: {
        userID: parseFloat(userId),
        userData: {
          name: userName,
          phone: userPhone,
          email: emailAfterUpdate,
        },
      },
    };
    const responseUpdateUser = await graphqlRequest(updateUserRequestParams);

    // Assert
    expect(responseUpdateUser.status).toBe(200);
    expect(responseUpdateUser.text).toContain(
      `Updating of email addresses is not supported: ${userId}`
    );
  });

  test('should update user and be available in "users" query', async () => {
    // Arrange
    const responseCreateUser = await createUserDetailsMutation(
      userName,
      userPhone,
      userEmail
    );
    userId = responseCreateUser.body.data.createUser.id;

    // Act
    const responseUpdateUser = await updateUserMutation(
      userId,
      userNameAfterUpdate,
      userPhone
    );

    const requestParamsQueryUsers = {
      query: `{users { 
        name 
        id
        email
        phone
      }}`,
    };
    const responseParamsQueryUsers = await graphqlRequest(
      requestParamsQueryUsers
    );

    // Assert
    expect(responseParamsQueryUsers.status).toBe(200);
    expect(responseParamsQueryUsers.body.data.users).toEqual(
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

describe('Users and Groups', () => {
  beforeEach(() => {
    userNameAfterUpdate = 'testUserAfterUpdate-Name' + Math.random().toString();
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
    expect(responseAddUserToGroup.body.data.addUserToGroup.id).toEqual(groupId);
    expect(responseAddUserToGroup.body.data.addUserToGroup.members).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: userId })])
    );
  });

  test.skip('should throw error whem add same "user", twice to same "group"', async () => {
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
    const responseAddUserToGroup = await addUserToGroup(userId, groupId);

    // Assert
    expect(responseAddUserToGroup.status).toBe(200);
    expect(responseAddUserToGroup.text).toContain(
      `User ${userEmail} already exists in group ${groupName}!`
    );
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
    expect(responseAddUserToGroupOne.body.data.addUserToGroup.members).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: userId })])
    );

    expect(responseAddUserToGroupTwo.status).toBe(200);
    expect(responseAddUserToGroupTwo.body.data.addUserToGroup.members).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: userId })])
    );
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
    expect(
      responseRemoveUserFromGroup.body.data.removeUserFromGroup.id
    ).toEqual(groupId);
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
});

describe('Query all users', () => {});
