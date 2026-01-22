import { vi } from 'vitest';
import { ValueProvider } from '@nestjs/common';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { PublicPart } from '../utils/public-part';

export const MockCommunicationAdapter: ValueProvider<
  PublicPart<CommunicationAdapter>
> = {
  provide: CommunicationAdapter,
  useValue: {
    syncActor: vi.fn(),
    createRoom: vi.fn(),
    getRoom: vi.fn(),
    getRoomMembers: vi.fn(),
    getMessage: vi.fn(),
    getThreadMessages: vi.fn(),
    sendMessage: vi.fn(),
    sendMessageReply: vi.fn(),
    deleteMessage: vi.fn(),
    batchAddMember: vi.fn(),
    batchRemoveMember: vi.fn(),
  },
};
