import { MockValueProvider } from '@test/utils/mock.value.provider';
import { ConfigService } from '@nestjs/config';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';

export const MockContributorLookupService: MockValueProvider<VirtualContributorLookupService> =
  {
    provide: ConfigService,
    useValue: {
      getVirtualContributorByNameIdOrFail: jest.fn(),
    },
  };
