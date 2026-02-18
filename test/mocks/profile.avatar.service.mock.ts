import { ProfileAvatarService } from '@domain/common/profile/profile.avatar.service';
import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '@test/utils/public-part';
import { vi } from 'vitest';

export const MockProfileAvatarService: ValueProvider<
  PublicPart<ProfileAvatarService>
> = {
  provide: ProfileAvatarService,
  useValue: {
    addAvatarVisualToProfile: vi.fn(),
    ensureAvatarIsStoredInLocalStorageBucket: vi.fn(),
  },
};
