import { registerEnumType } from '@nestjs/graphql';

// Credentials to be added later:
export enum ForumDiscussionCategory {
  RELEASES = 'releases',
  PLATFORM_FUNCTIONALITIES = 'platform-functionalities',
  COMMUNITY_BUILDING = 'community-building',
  CHALLENGE_CENTRIC = 'challenge-centric',
  HELP = 'help',
  OTHER = 'other',
}

registerEnumType(ForumDiscussionCategory, {
  name: 'ForumDiscussionCategory',
});
