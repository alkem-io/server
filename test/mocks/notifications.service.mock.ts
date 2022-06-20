import { NOTIFICATIONS_SERVICE } from '@common/constants';
import { ValueProvider } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PublicPart } from '../utils/public-part';

export const MockNotificationsService: ValueProvider<PublicPart<ClientProxy>> =
  {
    provide: NOTIFICATIONS_SERVICE,
    useValue: {
      send: jest.fn(),
      emit: jest.fn(),
    },
  };
