import { ApplicationService } from '@domain/access/application/application.service';
import { ValueProvider } from '@nestjs/common';
import { vi } from 'vitest';
import { PublicPart } from '../utils/public-part';

export const MockApplicationService: ValueProvider<
  PublicPart<ApplicationService>
> = {
  provide: ApplicationService,
  useValue: {
    findApplicationsForUser: vi.fn(),
    isFinalizedApplication: vi.fn(),
    getLifecycleState: vi.fn(),
  },
};
