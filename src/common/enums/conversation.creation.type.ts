import { registerEnumType } from '@nestjs/graphql';

export enum ConversationCreationType {
  DIRECT = 'direct',
  GROUP = 'group',
}

registerEnumType(ConversationCreationType, {
  name: 'ConversationCreationType',
  description:
    'The type of conversation to create. Maps to room type: DIRECT → DM room, GROUP → group room.',
});
