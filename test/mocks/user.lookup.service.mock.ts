import { UserService } from '@domain/community/user/user.service';
import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';
import { UserLookupService } from '@services/infrastructure/user-lookup/user.lookup.service';

export const MockUserLookupService: ValueProvider<
  PublicPart<UserLookupService>
> = {
  provide: UserService,
  useValue: {
    getContributorsManagedByUser: jest.fn(),
  },
};
