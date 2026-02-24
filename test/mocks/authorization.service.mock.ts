import { AuthorizationService } from '@core/authorization/authorization.service';
import { ValueProvider } from '@nestjs/common';
import { vi } from 'vitest';
import { PublicPart } from '../utils/public-part';

export const MockAuthorizationService: ValueProvider<
  PublicPart<AuthorizationService>
> = {
  provide: AuthorizationService,
  useValue: {
    grantAccessOrFail: vi.fn(),
    isAccessGranted: vi.fn(),
  },
};
