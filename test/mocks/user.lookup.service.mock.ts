import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';
import { ContributorLookupService } from '@services/infrastructure/contributor-lookup/contributor.lookup.service';

export const MockUserLookupService: ValueProvider<
  PublicPart<ContributorLookupService>
> = {
  provide: ContributorLookupService,
  useValue: {
    getContributorsManagedByUser: jest.fn(),
    getUserByUUID: jest.fn(),
    getUserByUuidOrFail: jest.fn(),
  },
};
