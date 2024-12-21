import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IUserSettings } from './user.settings.interface';
import { UpdateUserSettingsEntityInput } from './dto/user.settings.dto.update';

@Injectable()
export class UserSettingsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public updateSettings(
    settings: IUserSettings,
    updateData: UpdateUserSettingsEntityInput
  ): IUserSettings {
    if (updateData.privacy) {
      if (updateData.privacy.contributionRolesPubliclyVisible) {
        settings.privacy.contributionRolesPubliclyVisible =
          updateData.privacy.contributionRolesPubliclyVisible;
      }
    }
    if (updateData.communication?.allowOtherUsersToSendMessages) {
      settings.communication.allowOtherUsersToSendMessages =
        updateData.communication.allowOtherUsersToSendMessages;
    }
    return settings;
  }
}
