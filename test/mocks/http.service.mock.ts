import { HttpService } from '@nestjs/axios';
import { vi } from 'vitest';
import { MockValueProvider } from '../utils/mock.value.provider';

export const MockHttpService: MockValueProvider<HttpService> = {
  provide: HttpService,
  useValue: {
    get: vi.fn(),
  },
};
