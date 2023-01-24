import { registerEnumType } from '@nestjs/graphql';

// Credentials to be added later:
export enum DiscussionCategoryCommunity {
  GENERAL = 'general',
  IDEAS = 'ideas',
  QUESTIONS = 'questions',
  SHARING = 'sharing',
}

registerEnumType(DiscussionCategoryCommunity, {
  name: 'DiscussionCategoryCommunity',
});
