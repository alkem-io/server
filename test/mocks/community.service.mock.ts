import { CommunityService } from '@domain/community/community/community.service';
import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';

export const MockCommunityService: ValueProvider<PublicPart<CommunityService>> =
  {
    provide: CommunityService,
    useValue: {
      isSpaceCommunity: jest.fn(),
    },
  };
