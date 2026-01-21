import { UserSettingsHomeSpaceValidationService } from '@domain/community/user-settings/user.settings.home.space.validation.service';
import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';

export const MockUserSettingsHomeSpaceValidationService: ValueProvider<
  PublicPart<UserSettingsHomeSpaceValidationService>
> = {
  provide: UserSettingsHomeSpaceValidationService,
  useValue: {
    validateSpaceAccess: jest.fn(),
    isHomeSpaceValid: jest.fn(),
  },
};
