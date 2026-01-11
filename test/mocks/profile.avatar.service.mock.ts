import { ValueProvider } from '@nestjs/common';
import { ProfileAvatarService } from '@domain/common/profile/profile.avatar.service';
import { PublicPart } from '@test/utils/public-part';

export const MockProfileAvatarService: ValueProvider<
  PublicPart<ProfileAvatarService>
> = {
  provide: ProfileAvatarService,
  useValue: {
    addAvatarVisualToProfile: jest.fn(),
    ensureAvatarIsStoredInLocalStorageBucket: jest.fn(),
  },
};
