import { LogContext } from '@common/enums/logging.context';
import { ValidationException } from '@common/exceptions';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';

/**
 * Validates that a `suggestedLanguage` value on an invitation input is in the
 * currently configured eligible-language set (DL-8 compose-time check).
 *
 * Separate from the consumption-time check in registration (which silently skips
 * ineligible stored suggestions — FR-018): this guard is called once up front in
 * the invite mutation, before any invitation row is written.
 *
 * An empty eligible set rejects every suggestion (config kill-switch — R-8).
 */
@Injectable()
export class RoleSetEligibleLanguageGuard {
  constructor(
    private readonly configService: ConfigService<AlkemioConfig, true>
  ) {}

  /**
   * Returns the current eligible language list from config.
   */
  getEligibleLanguages(): string[] {
    const languageConfig = this.configService.get('language', { infer: true });
    const raw: string = languageConfig?.eligible ?? '';
    return raw
      ? raw
          .split(',')
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0)
      : [];
  }

  /**
   * Throws a ValidationException if `language` is not in the current eligible set.
   * Call this once up front when `suggestedLanguage` is provided on the invite input.
   */
  isEligibleLanguageOrFail(language: string): void {
    const eligible = this.getEligibleLanguages();
    if (!eligible.includes(language)) {
      throw new ValidationException(
        `Suggested language '${language}' is not in the eligible set [${eligible.join(', ')}]. Only eligible languages may be suggested on an invitation (DL-8).`,
        LogContext.COMMUNITY
      );
    }
  }
}
