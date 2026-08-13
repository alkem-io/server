import { parseSupportedEligibleLanguages } from '@common/constants/supported.languages';
import { LogContext } from '@common/enums/logging.context';
import { ValidationException } from '@common/exceptions';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';

/**
 * Validates that a `suggestedLanguage` value on an invitation input is in the
 * currently configured eligible-language set (compose-time check).
 *
 * Separate from the consumption-time check in registration (which silently skips
 * ineligible stored suggestions): this guard is called once up front in
 * the invite mutation, before any invitation row is written.
 *
 * An empty eligible set rejects every suggestion (config kill-switch).
 */
@Injectable()
export class RoleSetEligibleLanguageGuard {
  constructor(
    private readonly configService: ConfigService<AlkemioConfig, true>
  ) {}

  /**
   * Returns the current eligible language list from config.
   * Uses parseSupportedEligibleLanguages so the result is always filtered
   * against SUPPORTED_INTERFACE_LANGUAGES — identical to Config.language.eligible
   * (3655923939).
   */
  getEligibleLanguages(): string[] {
    const languageConfig = this.configService.get('language', { infer: true });
    const raw: string = languageConfig?.eligible ?? '';
    return parseSupportedEligibleLanguages(raw);
  }

  /**
   * Throws a ValidationException if `language` is not in the current eligible set.
   * Call this once up front when `suggestedLanguage` is provided on the invite input.
   */
  isEligibleLanguageOrFail(language: string): void {
    const eligible = this.getEligibleLanguages();
    if (!eligible.includes(language)) {
      throw new ValidationException(
        'Suggested language is not in the eligible set. Only eligible languages may be suggested on an invitation.',
        LogContext.COMMUNITY,
        { language, eligible }
      );
    }
  }
}
