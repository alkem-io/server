import { MockValueProvider } from '@test/utils/mock.value.provider';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';

export const MockOrganizationLookupService: MockValueProvider<OrganizationLookupService> =
  {
    provide: OrganizationLookupService,
    useValue: {
      getOrganizationByIdOrFail: jest.fn(),
      getOrganizationByNameIdOrFail: jest.fn(),
    },
  };
