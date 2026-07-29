import { RoleSetEligibleLanguageGuard } from '@domain/access/role-set/role.set.eligible.language.guard';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { KonfigService } from './config.service';

/**
 * Unit tests for language config parsing in KonfigService.
 * Tests call getConfig() directly to ensure the real wiring is exercised, not
 * just an inline re-implementation of the parse logic.
 */
describe('ConfigService', () => {
  let service: KonfigService;

  /**
   * Minimal ConfigService stub that returns controlled language values and
   * enough platform stubs for getConfig() to complete without errors.
   */
  function makeConfigServiceStub(languageConfig: {
    eligible: string;
    default: string;
  }) {
    return {
      get: (key: string) => {
        if (key === 'language') return languageConfig;
        if (key === 'hosting.endpoint_cluster') return 'http://localhost:3000';
        if (key === 'hosting.subscriptions.enabled') return false;
        if (key === 'hosting.environment') return 'test';
        if (key === 'platform')
          return {
            documentation_path: '/docs',
            terms: '',
            privacy: '',
            security: '',
            support: '',
            feedback: '',
            forumreleases: '',
            about: '',
            landing: '',
            blog: '',
            impact: '',
            inspiration: '',
            innovationLibrary: '',
            foundation: '',
            contactsupport: '',
            switchplan: '',
            opensource: '',
            releases: '',
            help: '',
            community: '',
            newuser: '',
            tips: '',
            aup: '',
            landing_page: { enabled: false },
            guidance_engine: { enabled: false },
          };
        if (key === 'monitoring')
          return {
            sentry: {
              enabled: false,
              endpoint: '',
              submit_pii: false,
              environment: 'test',
            },
            apm: { rumEnabled: false, endpoint: '' },
          };
        if (key === 'integrations.geo')
          return { enabled: false, rest_endpoint: '' };
        if (key === 'storage.file') return { max_file_size: 0 };
        if (key === 'identity.authentication.providers.ory')
          return {
            kratos_public_base_url: 'http://kratos:4433',
            issuer: 'http://kratos:4433',
          };
        if (key === 'communications.enabled') return false;
        if (key === 'communications.discussions.enabled') return false;
        if (key === 'notifications.enabled') return false;
        if (key === 'collaboration.whiteboards.enabled') return false;
        if (key === 'collaboration.memo.enabled') return false;
        if (key === 'platform.landing_page.enabled') return false;
        if (key === 'platform.guidance_engine.enabled') return false;
        return undefined;
      },
    };
  }

  async function buildServiceWithLanguageConfig(languageConfig: {
    eligible: string;
    default: string;
  }): Promise<KonfigService> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KonfigService],
    })
      .useMocker(token => {
        if (token === ConfigService) {
          return makeConfigServiceStub(languageConfig);
        }
        return defaultMockerFactory(token);
      })
      .compile();

    return module.get<KonfigService>(KonfigService);
  }

  it('should be defined', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KonfigService, ConfigService],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<KonfigService>(KonfigService);
    expect(service).toBeDefined();
  });

  describe('language config parsing (contract C2)', () => {
    it('should return eligible:[nl] and default:en from the yml defaults', async () => {
      service = await buildServiceWithLanguageConfig({
        eligible: 'nl',
        default: 'en',
      });

      const config = await service.getConfig();
      expect(config.language?.eligible).toEqual(['nl']);
      expect(config.language?.default).toBe('en');
    });

    it('should parse a comma-separated multi-value eligible string', async () => {
      service = await buildServiceWithLanguageConfig({
        eligible: 'nl,de,fr',
        default: 'en',
      });

      const config = await service.getConfig();
      expect(config.language?.eligible).toEqual(['nl', 'de', 'fr']);
    });

    it('should return an empty array when eligible is an empty string (kill-switch)', async () => {
      service = await buildServiceWithLanguageConfig({
        eligible: '',
        default: 'en',
      });

      const config = await service.getConfig();
      expect(config.language?.eligible).toEqual([]);
    });

    it('should trim whitespace from eligible values', async () => {
      service = await buildServiceWithLanguageConfig({
        eligible: ' nl , de ',
        default: 'en',
      });

      const config = await service.getConfig();
      expect(config.language?.eligible).toEqual(['nl', 'de']);
    });

    it('should drop eligible values that are not in SUPPORTED_INTERFACE_LANGUAGES', async () => {
      // 'xx' is not a supported language — it must be silently dropped
      service = await buildServiceWithLanguageConfig({
        eligible: 'nl,xx',
        default: 'en',
      });

      const config = await service.getConfig();
      expect(config.language?.eligible).toEqual(['nl']);
      // 'xx' must NOT appear in the list
      expect(config.language?.eligible).not.toContain('xx');
    });

    it('should return an empty eligible list when all configured values are unsupported', async () => {
      service = await buildServiceWithLanguageConfig({
        eligible: 'xx,yy',
        default: 'en',
      });

      const config = await service.getConfig();
      expect(config.language?.eligible).toEqual([]);
    });

    it('should fall back default to "en" when LANGUAGE_DEFAULT is set to an unsupported value (3655923899)', async () => {
      service = await buildServiceWithLanguageConfig({
        eligible: 'nl',
        default: 'xx', // not in SUPPORTED_INTERFACE_LANGUAGES
      });

      const config = await service.getConfig();
      expect(config.language?.default).toBe('en');
    });

    it('should accept a supported LANGUAGE_DEFAULT without falling back', async () => {
      service = await buildServiceWithLanguageConfig({
        eligible: 'nl',
        default: 'nl',
      });

      const config = await service.getConfig();
      expect(config.language?.default).toBe('nl');
    });

    it('guard and config resolve an identical eligible set for the same raw config (3655923939)', async () => {
      // Both KonfigService and RoleSetEligibleLanguageGuard call
      // parseSupportedEligibleLanguages — invoke BOTH for the same raw string
      // (mixing supported + unsupported) and assert they agree, so a future
      // divergence between the two paths is actually caught.
      const languageConfig = { eligible: 'nl,xx,de', default: 'en' };
      service = await buildServiceWithLanguageConfig(languageConfig);

      const config = await service.getConfig();
      // 'xx' must be dropped; 'nl' and 'de' must be kept (in order)
      expect(config.language?.eligible).toEqual(['nl', 'de']);

      // The invite-time compose guard MUST resolve the same eligible set.
      const guard = new RoleSetEligibleLanguageGuard({
        get: (key: string) => (key === 'language' ? languageConfig : undefined),
      } as any);
      expect(guard.getEligibleLanguages()).toEqual(config.language?.eligible);
    });
  });
});
