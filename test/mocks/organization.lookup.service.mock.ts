import { MockValueProvider } from '@test/utils/mock.value.provider';
import { ConfigService } from '@nestjs/config';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';

export const MockContributorLookupService: MockValueProvider<OrganizationLookupService> =
  {
    provide: ConfigService,
    useValue: {
      getOrganizationByNameIdOrFail: jest.fn(),
    },
  };
