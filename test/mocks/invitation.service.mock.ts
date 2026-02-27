import { InvitationService } from '@domain/access/invitation/invitation.service';
import { ValueProvider } from '@nestjs/common';
import { vi } from 'vitest';
import { PublicPart } from '../utils/public-part';

export const MockInvitationService: ValueProvider<
  PublicPart<InvitationService>
> = {
  provide: InvitationService,
  useValue: {
    findInvitationsForActor: vi.fn(),
    isFinalizedInvitation: vi.fn(),
    getLifecycleState: vi.fn(),
  },
};
