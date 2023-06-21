import { SpaceService } from '@domain/challenge/space/space.service';
import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';

export const MockSpaceService: ValueProvider<PublicPart<SpaceService>> = {
  provide: SpaceService,
  useValue: {
    getSpaceOrFail: jest.fn(),
  },
};
