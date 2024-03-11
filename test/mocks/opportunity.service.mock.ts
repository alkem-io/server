import { OpportunityService } from '@domain/challenge/opportunity/opportunity.service';
import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';

export const MockOpportunityService: ValueProvider<
  PublicPart<OpportunityService>
> = {
  provide: OpportunityService,
  useValue: {
    getOpportunityForCommunity: jest.fn(),
    getOpportunityOrFail: jest.fn(),
    getSpaceID: jest.fn(),
  },
};
