import { registerEnumType } from '@nestjs/graphql';

export enum CommunicationConversationType {
  USER_USER = 'user-user',
  USER_AGENT = 'user-agent',
}

registerEnumType(CommunicationConversationType, {
  name: 'CommunicationConversationType',
});
