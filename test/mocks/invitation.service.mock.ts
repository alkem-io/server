import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';
import { InvitationService } from '@domain/access/invitation/invitation.service';

export const MockInvitationService: ValueProvider<
  PublicPart<InvitationService>
> = {
  provide: InvitationService,
  useValue: {
    findInvitationsForActor: jest.fn(),
    isFinalizedInvitation: jest.fn(),
    getLifecycleState: jest.fn(),
  },
};
