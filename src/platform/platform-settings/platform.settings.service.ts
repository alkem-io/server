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
        // Initialize notificationEmailBlacklist to empty array if missing
        notificationEmailBlacklist:
          settings.integration?.notificationEmailBlacklist || [],
      },
    };
    if (updateData.integration) {
      if (updateData.integration.iframeAllowedUrls !== undefined) {
        updatedSettings.integration.iframeAllowedUrls =
          updateData.integration.iframeAllowedUrls;
      }
      if (updateData.integration.notificationEmailBlacklist !== undefined) {
        updatedSettings.integration.notificationEmailBlacklist =
          updateData.integration.notificationEmailBlacklist;
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

  public addNotificationEmailToBlacklistOrFail(
    settings: IPlatformSettings,
    email: string
  ): string[] | never {
    if (!settings.integration)
      throw new EntityNotInitializedException(
        'Settings not initialized',
        LogContext.PLATFORM
      );

    // Initialize blacklist if not present
    const currentEmails =
      settings.integration.notificationEmailBlacklist || [];

    // Reject wildcard characters
    if (email.includes('*') || email.includes('?')) {
      throw new Error(
        'Wildcard characters are not allowed in email addresses'
      );
    }

    // Lowercase for canonical storage and comparison
    const canonicalEmail = email.toLowerCase();

    // Check for duplicates (case-insensitive)
    if (currentEmails.some(e => e.toLowerCase() === canonicalEmail)) {
      throw new Error(`Email ${canonicalEmail} is already in the blacklist`);
    }

    // Enforce 250 entry limit
    if (currentEmails.length >= 250) {
      throw new Error(
        'Blacklist limit of 250 entries reached. Remove entries before adding new ones.'
      );
    }

    // Add email to blacklist
    currentEmails.push(canonicalEmail);

    return currentEmails;
  }

  public removeNotificationEmailFromBlacklistOrFail(
    settings: IPlatformSettings,
    email: string
  ): string[] | never {
    if (!settings.integration)
      throw new EntityNotInitializedException(
        'Settings not initialized',
        LogContext.PLATFORM
      );

    const currentEmails =
      settings.integration.notificationEmailBlacklist || [];

    // Lowercase for canonical comparison
    const canonicalEmail = email.toLowerCase();

    // Check if email exists
    if (!currentEmails.some(e => e.toLowerCase() === canonicalEmail)) {
      throw new Error(`Email ${canonicalEmail} not found in blacklist`);
    }

    // Remove email from blacklist (case-insensitive)
    const updatedEmails = currentEmails.filter(
      e => e.toLowerCase() !== canonicalEmail
    );

    return updatedEmails;
  }
}
