import { ValueProvider } from '@nestjs/common';
import { SpaceFilterService } from '@services/infrastructure/space-filter/space.filter.service';
import { vi } from 'vitest';
import { PublicPart } from '../utils/public-part';

export const MockSpaceFilterService: ValueProvider<
  PublicPart<SpaceFilterService>
> = {
  provide: SpaceFilterService,
  useValue: {
    getAllowedVisibilities: vi.fn(),
    isVisible: vi.fn(),
  },
};
