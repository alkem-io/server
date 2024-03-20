import { registerEnumType } from '@nestjs/graphql';

export enum CommunicationDiscussionPrivacy {
  AUTHOR = 'author',
  AUTHENTICATED = 'authenticated',
  PUBLIC = 'public',
}

registerEnumType(CommunicationDiscussionPrivacy, {
  name: 'CommunicationDiscussionPrivacy',
});
