import { SpaceService } from '@domain/space/space/space.service';
import { ValueProvider } from '@nestjs/common';
import { vi } from 'vitest';
import { PublicPart } from '../utils/public-part';

export const MockSpaceService: ValueProvider<PublicPart<SpaceService>> = {
  provide: SpaceService,
  useValue: {
    getSpaceOrFail: vi.fn(),
  },
};
