import {
  createUserMutation,
  getUsersProfile,
  removeUserMutation,
  updateProfileMutation,
} from './user.request.params';
import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';

let userFirstName = '';
let userLastName = '';
let userName = '';
let userId = '';
let profileId = '';
let userPhone = '';
let userEmail = '';
let uniqueId = '';
const profileDescritpion = 'y';
const profileAvatar = 'http://yProf.com';
const profileTagsetsName = 'x';
const profileTagestTags = ['y1', 'y2'];
const profileRefName = 'x';
const profileRefDescription = 'yRef';
const profileRefUri = 'http://yRef.com';

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
});

afterAll(async () => {
  if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
});

beforeEach(() => {
  uniqueId = Math.random()
    .toString(36)
    .slice(-6);
  userName = `testUser${uniqueId}`;
  userFirstName = `FirstName ${uniqueId}`;
  userLastName = `LastName ${uniqueId}`;
  userPhone = `userPhone ${uniqueId}`;
  userEmail = `${uniqueId}@test.com`;
});

describe('Create User', () => {
  afterEach(async () => {
    await removeUserMutation(userId);
  });

  test('should update profile and query the updated data', async () => {
    // Arrange
    const response = await createUserMutation(userName);
    profileId = response.body.data.createUser.profile.id;
    userId = response.body.data.createUser.id;

    // Act
    const updateProfileResponse = await updateProfileMutation(
      profileId,
      profileDescritpion,
      profileAvatar,
      profileTagsetsName,
      profileTagestTags,
      profileRefName,
      profileRefUri,
      profileRefDescription
    );

    const getProfileDataResponse = await getUsersProfile(userId);
    const profileData = getProfileDataResponse.body.data.user.profile;

    // Assert
    expect(response.status).toBe(200);
    expect(updateProfileResponse.body.data.updateProfile).toEqual(true);
    expect(profileData.description).toEqual(profileDescritpion);
    expect(profileData.avatar).toEqual(profileAvatar);
    expect(profileData.tagsets[1].name).toEqual(profileTagsetsName);
    expect(profileData.tagsets[1].tags).toEqual(profileTagestTags);
    expect(profileData.references[0].name).toEqual(profileRefName);
    expect(profileData.references[0].description).toEqual(
      profileRefDescription
    );
    expect(profileData.references[0].uri).toEqual(profileRefUri);
  });
});
