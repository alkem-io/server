import { MockValueProvider } from '@test/utils/mock.value.provider';
import { ConfigService } from '@nestjs/config';
import { ContributorLookupService } from '@services/infrastructure/contributor-lookup/contributor.lookup.service';

export const MockContributorLookupService: MockValueProvider<ContributorLookupService> =
  {
    provide: ConfigService,
    useValue: {
      getContributorsManagedByUser: jest.fn(),
    },
  };
