import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';
import { InvitationService } from '@domain/community/invitation/invitation.service';

export const MockInvitationService: ValueProvider<
  PublicPart<InvitationService>
> = {
  provide: InvitationService,
  useValue: {
    findInvitationsForUser: jest.fn(),
    isFinalizedInvitation: jest.fn(),
    getInvitationState: jest.fn(),
  },
};
