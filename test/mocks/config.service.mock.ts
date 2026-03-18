import { ConfigService } from '@nestjs/config';
import { MockValueProvider } from '@test/utils/mock.value.provider';
import { vi } from 'vitest';

export const MockConfigService: MockValueProvider<ConfigService> = {
  provide: ConfigService,
  useValue: {
    get: vi.fn(),
  },
};
