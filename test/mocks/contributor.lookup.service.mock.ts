import { vi } from 'vitest';
import { ValueProvider } from '@nestjs/common';
import { ContributorLookupService } from '@services/infrastructure/contributor-lookup/contributor.lookup.service';
import { PublicPart } from '@test/utils/public-part';

export const MockContributorLookupService: ValueProvider<
  PublicPart<ContributorLookupService>
> = {
  provide: ContributorLookupService,
  useValue: {
    getContributorsManagedByUser: vi.fn(),
  },
};
