import { vi } from 'vitest';
import { MockValueProvider } from '@test/utils/mock.value.provider';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';

export const MockVirtualContributorLookupService: MockValueProvider<VirtualContributorLookupService> =
  {
    provide: VirtualContributorLookupService,
    useValue: {
      getVirtualContributorByNameIdOrFail: vi.fn(),
    },
  };
