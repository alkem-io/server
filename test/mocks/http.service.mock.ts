import { HttpService } from '@nestjs/axios';
import { MockValueProvider } from '../utils/mock.value.provider';

export const MockHttpService: MockValueProvider<HttpService> = {
  provide: HttpService,
  useValue: {
    get: jest.fn(),
  },
};
