import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';

export const MockVirtualContributorService: ValueProvider<
  PublicPart<VirtualContributorService>
> = {
  provide: VirtualContributorService,
  useValue: {
    createVirtualContributor: jest.fn(),
    deleteVirtualContributor: jest.fn(),
    save: jest.fn(),
    getVirtualContributor: jest.fn(),
  },
};
