import { ValueProvider } from '@nestjs/common';
import { HubFilterService } from '@services/infrastructure/hub-filter/hub.filter.service';
import { PublicPart } from '../utils/public-part';

export const MockHubFilterService: ValueProvider<PublicPart<HubFilterService>> =
  {
    provide: HubFilterService,
    useValue: {
      getAllowedVisibilities: jest.fn(),
      isVisible: jest.fn(),
    },
  };
