import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IPlatformSettings } from './platform.settings.interface';
import { UpdatePlatformSettingsInput } from './dto/platform.settings.dto.update';

@Injectable()
export class PlatformSettingsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public updateSettings(
    settings: IPlatformSettings,
    updateData: UpdatePlatformSettingsInput
  ): IPlatformSettings {
    if (updateData.integration) {
      if (updateData.integration.iframeAllowedUrls !== undefined) {
        settings.integration.iframeAllowedUrls =
          updateData.integration.iframeAllowedUrls;
      }
    }
    return settings;
  }
}
