import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { RoleSetEligibleLanguageGuard } from './role.set.eligible.language.guard';

/**
 * Unit tests for the compose-time eligible-language guard (T006 / DL-8 / R-8).
 */
describe('RoleSetEligibleLanguageGuard', () => {
  async function buildGuard(
    eligible: string
  ): Promise<RoleSetEligibleLanguageGuard> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoleSetEligibleLanguageGuard],
    })
      .useMocker(token => {
        if (token === ConfigService) {
          return {
            get: (key: string) => {
              if (key === 'language') return { eligible, default: 'en' };
              return undefined;
            },
          };
        }
        return defaultMockerFactory(token);
      })
      .compile();

    return module.get(RoleSetEligibleLanguageGuard);
  }

  it('should accept an eligible language without throwing', async () => {
    const guard = await buildGuard('nl');

    expect(() => guard.isEligibleLanguageOrFail('nl')).not.toThrow();
  });

  it('should reject a supported-but-ineligible language (de) with ValidationException and a static message', async () => {
    // eligible = 'nl' only; 'de' is in supported set but not eligible
    const guard = await buildGuard('nl');

    expect(() => guard.isEligibleLanguageOrFail('de')).toThrowError(
      expect.objectContaining({
        message: expect.stringContaining(
          'Suggested language is not in the eligible set'
        ),
      })
    );
  });

  it('should reject any language when the eligible set is empty (kill switch)', async () => {
    const guard = await buildGuard('');

    expect(() => guard.isEligibleLanguageOrFail('nl')).toThrowError(
      expect.objectContaining({
        message: expect.stringContaining(
          'Suggested language is not in the eligible set'
        ),
      })
    );
  });

  it('should return the eligible list from getEligibleLanguages', async () => {
    const guard = await buildGuard('nl,de');

    expect(guard.getEligibleLanguages()).toEqual(['nl', 'de']);
  });

  it('should return an empty array from getEligibleLanguages when the set is empty', async () => {
    const guard = await buildGuard('');

    expect(guard.getEligibleLanguages()).toEqual([]);
  });

  it('should drop unsupported entries from getEligibleLanguages (3655923939)', async () => {
    // 'xx' is not in SUPPORTED_INTERFACE_LANGUAGES — must be dropped
    const guard = await buildGuard('nl,xx,de');

    expect(guard.getEligibleLanguages()).toEqual(['nl', 'de']);
    expect(guard.getEligibleLanguages()).not.toContain('xx');
  });

  it('should reject an unsupported eligible config entry via isEligibleLanguageOrFail (3655923939)', async () => {
    // Even if 'xx' appears in config, it must not be accepted as eligible
    const guard = await buildGuard('xx');

    expect(() => guard.isEligibleLanguageOrFail('xx')).toThrowError(
      expect.objectContaining({
        message: expect.stringContaining(
          'Suggested language is not in the eligible set'
        ),
      })
    );
  });
});
