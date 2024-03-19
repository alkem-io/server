import { registerEnumType } from '@nestjs/graphql';

// Credentials to be added later:
export enum DiscussionCategoryPlatform {
  PLATFORM_FUNCTIONALITIES = 'platform-functionalities',
  COMMUNITY_BUILDING = 'community-building',
  CHALLENGE_CENTRIC = 'challenge-centric',
  HELP = 'help',
  OTHER = 'other',
}

registerEnumType(DiscussionCategoryPlatform, {
  name: 'DiscussionCategoryPlatform',
});
