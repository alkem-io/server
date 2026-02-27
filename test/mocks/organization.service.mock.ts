import { OrganizationService } from '@domain/community/organization/organization.service';
import { ValueProvider } from '@nestjs/common';
import { vi } from 'vitest';
import { PublicPart } from '../utils/public-part';

export const MockOrganizationService: ValueProvider<
  PublicPart<OrganizationService>
> = {
  provide: OrganizationService,
  useValue: {
    getOrganizationOrFail: vi.fn(),
  },
};
