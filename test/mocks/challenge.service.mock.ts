import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';

export const MockChallengeService: ValueProvider<PublicPart<ChallengeService>> =
  {
    provide: ChallengeService,
    useValue: {
      getChallengeOrFail: jest.fn(),
      getChallengeForCommunity: jest.fn(),
      getSpaceID: jest.fn(),
    },
  };
