import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { ValueProvider } from '@nestjs/common';
import { vi } from 'vitest';
import { PublicPart } from '../utils/public-part';

export const MockUserLookupService: ValueProvider<
  PublicPart<UserLookupService>
> = {
  provide: UserLookupService,
  useValue: {
    getUserByNameIdOrFail: vi.fn(),
    getUserById: vi.fn(),
    getUserByIdOrFail: vi.fn(),
    isRegisteredUser: vi.fn(),
  },
};
