import { AUTH_RESET_SERVICE } from '@common/constants';
import { ValueProvider } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PublicPart } from '../utils/public-part';

export const MockAuthResetService: ValueProvider<PublicPart<ClientProxy>> = {
  provide: AUTH_RESET_SERVICE,
  useValue: {
    send: jest.fn(),
    emit: jest.fn(),
  },
};
