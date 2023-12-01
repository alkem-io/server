import { registerEnumType } from '@nestjs/graphql';

export enum DiscussionsOrderBy {
  DISCUSSIONS_CREATEDATE_ASC = 'discussions.createdDate_ASC',
  DISCUSSIONS_CREATEDATE_DESC = 'discussions.createdDate_DESC',
  // LAST_MESSAGE_ASC = 'lastMessage.createdDate_ASC',
  // LAST_MESSAGE_DESC = 'lastMessage.createdDate_DESC',
}

registerEnumType(DiscussionsOrderBy, {
  name: 'DiscussionsOrderBy',
});
