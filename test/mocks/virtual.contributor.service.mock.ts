import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { ValueProvider } from '@nestjs/common';
import { vi } from 'vitest';
import { PublicPart } from '../utils/public-part';

export const MockVirtualContributorService: ValueProvider<
  PublicPart<VirtualContributorService>
> = {
  provide: VirtualContributorService,
  useValue: {
    createVirtualContributor: vi.fn(),
    deleteVirtualContributor: vi.fn(),
    save: vi.fn(),
    getVirtualContributor: vi.fn(),
  },
};
