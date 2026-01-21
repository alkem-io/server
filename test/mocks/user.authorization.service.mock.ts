import { vi } from 'vitest';
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';
import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';

export const MockUserAuthorizationService: ValueProvider<
  PublicPart<UserAuthorizationService>
> = {
  provide: UserAuthorizationService,
  useValue: {
    grantCredentialsAllUsersReceive: vi.fn(),
    applyAuthorizationPolicy: vi.fn(),
  },
};
