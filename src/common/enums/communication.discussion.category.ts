import { registerEnumType } from '@nestjs/graphql';

// Credentials to be added later:
export enum DiscussionCategory {
  GENERAL = 'general',
  IDEAS = 'ideas',
  QUESTIONS = 'questions',
  SHARING = 'sharing',
}

registerEnumType(DiscussionCategory, {
  name: 'DiscussionCategory',
});
