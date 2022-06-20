import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LoggerService, ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';

export const MockWinstonProvider: ValueProvider<PublicPart<LoggerService>> = {
  provide: WINSTON_MODULE_NEST_PROVIDER,
  useValue: {
    error: jest.fn(),
    warn: jest.fn(),
    verbose: jest.fn(),
  },
};
