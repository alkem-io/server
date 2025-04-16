import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IPlatformSettings } from './platform.settings.interface';
import { UpdatePlatformSettingsInput } from './dto/platform.settings.dto.update';
import { EntityNotInitializedException } from '@common/exceptions';
import { LogContext } from '@common/enums';

@Injectable()
export class PlatformSettingsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public updateSettings(
    settings: IPlatformSettings,
    updateData: UpdatePlatformSettingsInput
  ): IPlatformSettings {
    const updatedSettings = {
      ...settings,
      integration: {
        ...settings.integration,
      },
    };
    if (updateData.integration) {
      if (updateData.integration.iframeAllowedUrls !== undefined) {
        updatedSettings.integration.iframeAllowedUrls =
          updateData.integration.iframeAllowedUrls;
      }
    }
    return updatedSettings;
  }

  public addIframeAllowedURLOrFail(
    settings: IPlatformSettings,
    iframeAllowedURL: string
  ): string[] | never {
    if (!settings.integration)
      throw new EntityNotInitializedException(
        'Settings  not initialized',
        LogContext.PLATFORM
      );
    const currentUrls = settings.integration?.iframeAllowedUrls;

    // Only add if not already present
    if (!currentUrls.includes(iframeAllowedURL)) {
      currentUrls.push(iframeAllowedURL);
    }

    return currentUrls;
  }

  public removeIframeAllowedURLOrFail(
    settings: IPlatformSettings,
    iframeAllowedURL: string
  ): string[] | never {
    if (!settings.integration)
      throw new EntityNotInitializedException(
        'Settings  not initialized',
        LogContext.PLATFORM
      );
    const currentUrls = settings.integration?.iframeAllowedUrls;

    const updatedUrls = currentUrls.filter(url => url !== iframeAllowedURL);

    return updatedUrls;
  }
}
