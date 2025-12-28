import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';

export const MockUserLookupService: ValueProvider<
  PublicPart<UserLookupService>
> = {
  provide: UserLookupService,
  useValue: {
    getUserByNameIdOrFail: jest.fn(),
    getUserById: jest.fn(),
    getUserByIdOrFail: jest.fn(),
    isRegisteredUser: jest.fn(),
  },
};
