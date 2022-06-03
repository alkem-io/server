import { OrganizationService } from '@domain/community/organization/organization.service';
import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';

export const MockOrganizationService: ValueProvider<
  PublicPart<OrganizationService>
> = {
  provide: OrganizationService,
  useValue: {
    getOrganizationAndAgent: jest.fn(),
    getOrganizationOrFail: jest.fn(),
  },
};
