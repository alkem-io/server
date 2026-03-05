import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { MockValueProvider } from '@test/utils/mock.value.provider';
import { vi } from 'vitest';

export const MockOrganizationLookupService: MockValueProvider<OrganizationLookupService> =
  {
    provide: OrganizationLookupService,
    useValue: {
      getOrganizationByIdOrFail: vi.fn(),
      getOrganizationByNameIdOrFail: vi.fn(),
    },
  };
