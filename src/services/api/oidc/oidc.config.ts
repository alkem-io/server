// filepath: /Users/antst/work/alkemio/server/src/services/api/oidc/oidc.config.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OidcConfig {
  private readonly webBaseUrl: string;
  private readonly apiPublicBasePath: string;
  private readonly kratosPublicUrl: string;

  constructor(private readonly configService: ConfigService) {
    // Reuse hosting.endpoint_cluster for web base URL
    const hostingConfig = this.configService.get('hosting', {
      infer: true,
    }) as any;
    if (!hostingConfig?.endpoint_cluster) {
      throw new Error('hosting.endpoint_cluster is not configured');
    }
    this.webBaseUrl = this.trimTrailingSlash(hostingConfig.endpoint_cluster);

    // Reuse hosting.path_api_public_rest for API base path
    if (!hostingConfig?.path_api_public_rest) {
      throw new Error('hosting.path_api_public_rest is not configured');
    }
    this.apiPublicBasePath = this.ensureLeadingSlash(
      hostingConfig.path_api_public_rest
    );

    // Reuse identity.authentication.providers.ory.kratos_public_base_url (full URL)
    const oryConfig = this.configService.get(
      'identity.authentication.providers.ory',
      { infer: true }
    ) as any;
    if (!oryConfig?.kratos_public_base_url) {
      throw new Error(
        'identity.authentication.providers.ory.kratos_public_base_url is not configured'
      );
    }
    this.kratosPublicUrl = this.trimTrailingSlash(
      oryConfig.kratos_public_base_url
    );
  }

  getWebBaseUrl(): string {
    return this.webBaseUrl;
  }

  getApiPublicBasePath(): string {
    return this.apiPublicBasePath;
  }

  // Returns full Kratos public URL (e.g., "http://localhost:3000/ory/kratos/public")
  getKratosPublicUrl(): string {
    return this.kratosPublicUrl;
  }

  // Extracts just the path from Kratos URL for URL construction
  // (e.g., "/ory/kratos/public" from "http://localhost:3000/ory/kratos/public")
  getKratosPublicBasePath(): string {
    try {
      const url = new URL(this.kratosPublicUrl);
      return url.pathname;
    } catch {
      // Fallback: if it's already a path, return as-is
      return this.kratosPublicUrl;
    }
  }

  // Helpers
  private trimTrailingSlash(value: string): string {
    return value.endsWith('/') ? value.slice(0, -1) : value;
  }

  private ensureLeadingSlash(path: string): string {
    return path.startsWith('/') ? path : `/${path}`;
  }
}
