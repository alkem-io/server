import { registerEnumType } from '@nestjs/graphql';

export enum ForumDiscussionPrivacy {
  AUTHOR = 'author',
  AUTHENTICATED = 'authenticated',
  PUBLIC = 'public',
}

registerEnumType(ForumDiscussionPrivacy, {
  name: 'ForumDiscussionPrivacy',
});
