import { LoggerService, ValueProvider } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { vi } from 'vitest';
import { PublicPart } from '../utils/public-part';

export const MockWinstonProvider: ValueProvider<PublicPart<LoggerService>> = {
  provide: WINSTON_MODULE_NEST_PROVIDER,
  useValue: {
    error: vi.fn(),
    warn: vi.fn(),
    verbose: vi.fn(),
  },
};
