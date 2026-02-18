export enum UrlPathBase {
  HOME = 'home',
  USER = 'user',
  ADMIN = 'admin',
  VIRTUAL = 'vc',
  ORGANIZATION = 'organization',
  DOCUMENTATION = 'documentation',
  INNOVATION_LIBRARY = 'innovation-library',
  INNOVATION_PACKS = 'innovation-packs',
  INNOVATION_HUBS = 'innovation-hubs',
  HUB = 'hub',
  FORUM = 'forum',
  SPACE_EXPLORER = 'spaces',
  CONTRIBUTORS_EXPLORER = 'contributors',
  ABOUT = 'about',
  PROFILE = 'profile',
  RESTRICTED = 'restricted',
  DOCS = 'docs',
  CONTACT = 'contact',

  // Flow routes
  CREATE_SPACE = 'create-space',

  // Identity routes
  LOGIN = 'login',
  LOGOUT = 'logout',
  REGISTRATION = 'registration',
  SIGN_UP = 'sign_up',
  VERIFY = 'verify',
  RECOVERY = 'recovery',
  REQUIRED = 'required',
  ERROR = 'error',

  // Legacy routes
  LANDING = 'landing', // Legacy route that redirects to Welcome site
  IDENTITY = 'identity', // Legacy route that's not used anymore but is decided to be reserved

  // Reserved routes
  FLOWS = 'flows',
}
