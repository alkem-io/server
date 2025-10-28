import { registerEnumType } from '@nestjs/graphql';

export enum CommunicationConversationType {
  USER_USER = 'user-user',
  USER_VC = 'user-vc',
}

registerEnumType(CommunicationConversationType, {
  name: 'CommunicationConversationType',
});
