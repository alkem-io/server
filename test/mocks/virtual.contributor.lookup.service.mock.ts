import { VirtualActorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { MockValueProvider } from '@test/utils/mock.value.provider';
import { vi } from 'vitest';

export const MockVirtualActorLookupService: MockValueProvider<VirtualActorLookupService> =
  {
    provide: VirtualActorLookupService,
    useValue: {
      getVirtualContributorByNameIdOrFail: vi.fn(),
    },
  };
