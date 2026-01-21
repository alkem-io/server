import { vi } from 'vitest';
import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';

export const MockUserLookupService: ValueProvider<
  PublicPart<UserLookupService>
> = {
  provide: UserLookupService,
  useValue: {
    getUserByNameIdOrFail: vi.fn(),
    getUserByUUID: vi.fn(),
    getUserOrFail: vi.fn(),
    isRegisteredUser: vi.fn(),
    getUserWithAgent: vi.fn(),
  },
};
