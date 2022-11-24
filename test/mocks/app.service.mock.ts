import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';
import { AppService } from '@src/app.service';

export const MockAppService: ValueProvider<PublicPart<AppService>> = {
  provide: AppService,
  useValue: {
    getHello: jest.fn(),
    completeCredentialRequestInteractionJolocom: jest.fn(),
    completeCredentialRequestInteractionSovrhd: jest.fn(),
    completeCredentialOfferInteraction: jest.fn(),
  },
};
