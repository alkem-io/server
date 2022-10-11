import { ValueProvider } from '@nestjs/common';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { PublicPart } from '../utils/public-part';

export const MockCommunicationAdapter: ValueProvider<
  PublicPart<CommunicationAdapter>
> = {
  provide: CommunicationAdapter,
  useValue: {
    sendMessageToUser: jest.fn(),
  },
};
