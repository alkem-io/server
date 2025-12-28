import { ValueProvider } from '@nestjs/common';
import { ContributorService } from '@domain/community/contributor/contributor.service';
import { PublicPart } from '@test/utils/public-part';

export const MockContributorService: ValueProvider<
  PublicPart<ContributorService>
> = {
  provide: ContributorService,
  useValue: {
    addAvatarVisualToContributorProfile: jest.fn(),
    ensureAvatarIsStoredInLocalStorageBucket: jest.fn(),
  },
};
