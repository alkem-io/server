import { UserSettingsHomeSpaceValidationService } from '@domain/community/user-settings/user.settings.home.space.validation.service';
import { ValueProvider } from '@nestjs/common';
import { vi } from 'vitest';
import { PublicPart } from '../utils/public-part';

export const MockUserSettingsHomeSpaceValidationService: ValueProvider<
  PublicPart<UserSettingsHomeSpaceValidationService>
> = {
  provide: UserSettingsHomeSpaceValidationService,
  useValue: {
    validateSpaceAccess: vi.fn(),
    isHomeSpaceValid: vi.fn(),
  },
};
