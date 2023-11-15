import { randomUUID } from 'crypto';
import { ValueProvider } from '@nestjs/common';
import { APP_ID } from '@common/constants';

export const APP_ID_VALUE = randomUUID();

export const APP_ID_PROVIDER: ValueProvider<string> = {
  provide: APP_ID,
  useValue: APP_ID_VALUE,
};
