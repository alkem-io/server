export enum UrlPathBase {
  HOME = 'home',
  USER = 'user',
  ADMIN = 'admin',
  VIRTUAL_CONTRIBUTOR = 'vc',
  ORGANIZATION = 'organization',
  DOCUMENTATION = 'documentation',
  INNOVATION_LIBRARY = 'innovation-library',
  INNOVATION_PACKS = 'innovation-packs',
  INNOVATION_HUBS = 'innovation-hubs',
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

  // Legacy routes
  LANDING = 'landing', // Legacy route that redirects to Welcome site
  IDENTITY = 'identity', // Legacy route that's not used anymore but is decided to be reserved

  // Reserved routes
  FLOWS = 'flows',
}
