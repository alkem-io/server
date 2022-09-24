import { HubService } from '@domain/challenge/hub/hub.service';
import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';

export const MockHubService: ValueProvider<PublicPart<HubService>> = {
  provide: HubService,
  useValue: {
    getHubOrFail: jest.fn(),
    getHubID: jest.fn(),
  },
};
