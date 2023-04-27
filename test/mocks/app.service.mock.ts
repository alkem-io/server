import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';
import { SsiCredentialFlowService } from '@services/api-rest/ssi-credential-flow/ssi.credential.flow.service';

export const MockSsiCredentialFlowService: ValueProvider<
  PublicPart<SsiCredentialFlowService>
> = {
  provide: SsiCredentialFlowService,
  useValue: {
    completeCredentialRequestInteractionJolocom: jest.fn(),
    completeCredentialRequestInteractionSovrhd: jest.fn(),
    completeCredentialOfferInteraction: jest.fn(),
  },
};
