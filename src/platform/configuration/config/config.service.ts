import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IConfig } from './config.interface';
import { IAuthenticationProviderConfig } from './authentication/providers/authentication.provider.config.interface';
import { IOryConfig } from './authentication/providers/ory/ory.config.interface';
import { PlatformFeatureFlagName } from '@common/enums/platform.feature.flag.name';
import { AlkemioConfig } from '@src/types';

@Injectable()
export class KonfigService {
  constructor(private configService: ConfigService<AlkemioConfig, true>) {}

  async getConfig(): Promise<IConfig> {
    const domain = new URL(
      this.configService.get('hosting.endpoint_cluster', { infer: true })
    ).hostname;

    const platform = this.configService.get('platform', { infer: true });

    const fullDocumentationUrl = new URL(
      platform.documentation_path,
      `https://${domain}`
    ).toString();

    const { sentry, apm } = this.configService.get('monitoring', {
      infer: true,
    });
    const geoConfig = this.configService.get('integrations.geo', {
      infer: true,
    });
    const fileConfig = this.configService.get('storage.file', {
      infer: true,
    });
    return {
      authentication: {
        providers: await this.getAuthenticationProvidersConfig(),
      },
      featureFlags: [
        {
          name: PlatformFeatureFlagName.SSI,
          enabled: this.configService.get('ssi.enabled', { infer: true }),
        },
        {
          name: PlatformFeatureFlagName.COMMUNICATIONS,
          enabled: this.configService.get('communications.enabled', {
            infer: true,
          }),
        },
        {
          name: PlatformFeatureFlagName.COMMUNICATIONS_DISCUSSIONS,
          enabled: this.configService.get(
            'communications.discussions.enabled',
            { infer: true }
          ),
        },
        {
          name: PlatformFeatureFlagName.SUBSCRIPTIONS,
          enabled: this.configService.get('hosting.subscriptions.enabled', {
            infer: true,
          }),
        },
        {
          name: PlatformFeatureFlagName.NOTIFICATIONS,
          enabled: this.configService.get('notifications.enabled', {
            infer: true,
          }),
        },
        {
          name: PlatformFeatureFlagName.WHITEBOARDS,
          enabled: this.configService.get('collaboration.whiteboards.enabled', {
            infer: true,
          }),
        },
        {
          name: PlatformFeatureFlagName.MEMO,
          enabled: this.configService.get('collaboration.memo.enabled', {
            infer: true,
          }),
        },
        {
          name: PlatformFeatureFlagName.LANDING_PAGE,
          enabled: this.configService.get('platform.landing_page.enabled', {
            infer: true,
          }),
        },
        {
          name: PlatformFeatureFlagName.GUIDENCE_ENGINE,
          enabled: this.configService.get('platform.guidance_engine.enabled', {
            infer: true,
          }),
        },
      ],
      locations: {
        domain,
        environment: this.configService.get('hosting.environment', {
          infer: true,
        }),
        terms: platform.terms,
        privacy: platform.privacy,
        security: platform.security,
        support: platform.support,
        feedback: platform.feedback,
        forumreleases: platform.forumreleases,
        about: platform.about,
        landing: platform.landing,
        blog: platform.blog,
        impact: platform.impact,
        inspiration: platform.inspiration,
        innovationLibrary: platform.innovationLibrary,
        foundation: platform.foundation,
        contactsupport: platform.contactsupport,
        switchplan: platform.switchplan,
        opensource: platform.opensource,
        releases: platform.releases,
        help: platform.help,
        community: platform.community,
        newuser: platform.newuser,
        tips: platform.tips,
        aup: platform.aup,
        documentation: fullDocumentationUrl,
      },
      sentry: {
        enabled: sentry?.enabled,
        endpoint: sentry?.endpoint,
        submitPII: sentry?.submit_pii,
        environment: sentry?.environment,
      },
      apm: {
        rumEnabled: apm?.rumEnabled,
        endpoint: apm?.endpoint,
      },
      geo: {
        enabled: geoConfig.enabled,
        endpoint: geoConfig.rest_endpoint,
      },
      storage: {
        file: {
          maxFileSize: fileConfig?.max_file_size,
        },
      },
    };
  }

  async getAuthenticationProvidersConfig(): Promise<
    IAuthenticationProviderConfig[]
  > {
    return [
      {
        name: 'Ory Kratos Config',
        label: 'Ory Kratos Config',
        icon: '',
        enabled: true,
        config: await this.getOryConfig(),
      },
    ];
  }

  async getOryConfig(): Promise<IOryConfig> {
    const oryConfig = this.configService.get(
      'identity.authentication.providers.ory',
      { infer: true }
    );
    return {
      kratosPublicBaseURL: oryConfig.kratos_public_base_url,
      issuer: oryConfig.issuer,
    } as IOryConfig;
  }
}
