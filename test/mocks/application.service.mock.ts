import { ApplicationService } from '@domain/community/application/application.service';
import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';

export const MockApplicationService: ValueProvider<
  PublicPart<ApplicationService>
> = {
  provide: ApplicationService,
  useValue: {
    findApplicationsForUser: jest.fn(),
    isFinalizedApplication: jest.fn(),
    getApplicationState: jest.fn(),
  },
};
