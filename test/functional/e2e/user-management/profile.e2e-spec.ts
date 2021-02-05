import {
  createUserMutation,
  getUsersProfile,
  removeUserMutation,
  updateProfileMutation,
} from './user.request.params';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';
import { TestUser } from '../../../utils/token.helper';

let userFirstName = '';
let userLastName = '';
let userName = '';
let userId = '';
let userPhone = '';
let userEmail = '';
let uniqueId = '';
const profileDescritpion = 'y';
const profileAvatar = 'http://yProf.com';
const profileTagsetsName = 'y';
const profileTagestTags = ['y1', 'y2'];
const profileRefName = 'yRef';
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

  test.skip('should update profile and query the updated data', async () => {
    // Arrange
    const response = await createUserMutation(userName);
    userId = response.body.data.createUser.id;

    // Act
    const updateProfileResponse = await updateProfileMutation(
      userId,
      profileDescritpion,
      profileAvatar,
      profileTagsetsName,
      profileTagestTags,
      profileRefName,
      profileRefDescription,
      profileRefUri
    );
    console.log(updateProfileResponse.body);

    const getProfileDataResponse = await getUsersProfile(userId);
    console.log(getProfileDataResponse.body.data.user.profile);
    const profileData = getProfileDataResponse.body.data.user.profile;

    // Assert
    expect(response.status).toBe(200);
    expect(updateProfileResponse.body.data.updateProfile).toEqual(true);
    expect(profileData.description).toEqual(profileDescritpion);
    expect(profileData.avatar).toEqual(profileAvatar);
    expect(profileData.tagsets.name).toEqual(profileTagsetsName);
    expect(profileData.tagsets.tags).toEqual(profileTagestTags);
    expect(profileData.references.name).toEqual(profileRefName);
    expect(profileData.references.description).toEqual(profileRefDescription);
    expect(profileData.references.uri).toEqual(profileRefUri);
  });
});
