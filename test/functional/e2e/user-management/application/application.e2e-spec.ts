import {
  createUserDetailsMutation,
  removeUserMutation,
} from '../user.request.params';
import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';
import { createChallangeMutation } from '@test/functional/integration/challenge/challenge.request.params';
import {
  createGroupOnCommunityMutation,
  getCommunityData,
} from '@test/functional/integration/community/community.request.params';
import {
  appData,
  createApplicationMutation,
  getApplication,
  removeApplicationMutation,
} from './application.request.params';

let userName = '';
let applicationId = '';
let applicationData;
let userFirstName = '';
let userLastName = '';
let userId = '';
let userPhone = '';
let userEmail = '';
let groupName = '';
let communityGroupId = '';
let challengeName = '';
let challengeCommunityId = '';
let uniqueId = '';
let ecoverseCommunityId = '';

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
  challengeName = `testChallenge ${uniqueId}`;
  userName = `testuser${uniqueId}`;
  userFirstName = `userFirstName${uniqueId}`;
  userLastName = `userLastName${uniqueId}`;
  userPhone = `userPhone ${uniqueId}`;
  userEmail = `${uniqueId}@test.com`;

  // Create user
  const responseCreateUser = await createUserDetailsMutation(
    userName,
    userFirstName,
    userLastName,
    userPhone,
    userEmail
  );
  userId = responseCreateUser.body.data.createUser.id;

  groupName = 'groupName ' + Math.random().toString();

  const ecoverseCommunityIds = await getCommunityData();
  ecoverseCommunityId = ecoverseCommunityIds.body.data.ecoverse.community.id;

  // Create challenge
  const responseCreateChallenge = await createChallangeMutation(
    challengeName,
    uniqueId
  );
  challengeCommunityId =
    responseCreateChallenge.body.data.createChallenge.community.id;

  // Create challenge community group
  const responseCreateGroupOnCommunnity = await createGroupOnCommunityMutation(
    ecoverseCommunityId,
    groupName
  );
  communityGroupId =
    responseCreateGroupOnCommunnity.body.data.createGroupOnCommunity.id;
});

describe('Application', () => {
  afterEach(async () => {
    await removeApplicationMutation(applicationId);
    await removeUserMutation(userId);
  });

  test('should create application', async () => {
    // Act
    applicationData = await createApplicationMutation(
      ecoverseCommunityId,
      userId
    );
    applicationId = applicationData.body.data.createApplication.id;

    const getApp = await getApplication(applicationId);

    // Assert
    expect(applicationData.status).toBe(200);
    expect(applicationData.body.data.createApplication.lifecycle.state).toEqual(
      'new'
    );
    expect(applicationData.body.data.createApplication).toEqual(
      getApp.body.data.ecoverse.application
    );
  });

  test('should throw error for creating the same application twice', async () => {
    // Act
    let applicationDataOne = await createApplicationMutation(
      ecoverseCommunityId,
      userId
    );
    applicationId = applicationDataOne.body.data.createApplication.id;
    let applicationDataTwo = await createApplicationMutation(
      ecoverseCommunityId,
      userId
    );

    // Assert
    expect(applicationDataTwo.text).toContain(
      `An application for user ${userEmail} already exists for Community: ${ecoverseCommunityId}.`
    );
  });

  test.skip('should throw error for quering not existing application', async () => {
    // Act
    let appId = '727';
    const getApp = await getApplication(appId);

    // Assert
    expect(getApp.status).toBe(200);
    expect(getApp.text).toContain(
      `Application with ID ${appId} can not be found!`
    );
  });

  test('should remove application', async () => {
    // Arrange
    applicationData = await createApplicationMutation(
      ecoverseCommunityId,
      userId
    );
    applicationId = applicationData.body.data.createApplication.id;

    // Act
    let removeApp = await removeApplicationMutation(applicationId);
    const getApp = await getApplication(applicationId);

    // Assert
    expect(removeApp.status).toBe(200);
    expect(getApp.text).toContain(
      `Application with ID ${applicationId} can not be found!`
    );
  });
});
