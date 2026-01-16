import { ValueProvider } from '@nestjs/common';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { PublicPart } from '../utils/public-part';

export const MockCommunicationAdapter: ValueProvider<
  PublicPart<CommunicationAdapter>
> = {
  provide: CommunicationAdapter,
  useValue: {
    syncActor: jest.fn(),
    createRoom: jest.fn(),
    getRoom: jest.fn(),
    getRoomMembers: jest.fn(),
    getMessage: jest.fn(),
    getThreadMessages: jest.fn(),
    sendMessage: jest.fn(),
    sendMessageReply: jest.fn(),
    deleteMessage: jest.fn(),
    batchAddMember: jest.fn(),
    batchRemoveMember: jest.fn(),
  },
};
