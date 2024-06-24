import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';
import { UserLookupService } from '@services/infrastructure/user-lookup/user.lookup.service';

export const MockUserLookupService: ValueProvider<
  PublicPart<UserLookupService>
> = {
  provide: UserLookupService,
  useValue: {
    getContributorsManagedByUser: jest.fn(),
    getUserByUUID: jest.fn(),
    getUserByUuidOrFail: jest.fn(),
  },
};
