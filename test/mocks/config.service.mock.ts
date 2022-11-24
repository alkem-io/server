import { MockValueProvider } from '@test/utils/mock.value.provider';
import { ConfigService } from '@nestjs/config';

export const MockConfigService: MockValueProvider<ConfigService> = {
  provide: ConfigService,
  useValue: {
    get: jest.fn(),
  },
};
