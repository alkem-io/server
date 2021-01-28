import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuthConfig,
  AadAuthenticationClient,
  Token,
  TokenError,
} from '@cmdbg/tokenator';
import { TokenException } from '../error-handling/exceptions';
import { AuthService } from './auth.service';

@Injectable()
export class AadOboStrategy implements AuthenticationProvider {
  constructor(
    private configService: ConfigService,
    private authService: AuthService
  ) {}

  async getAccessToken(): Promise<string> {
    const authClient = new AadAuthenticationClient(
      () => this.configService.get<AuthConfig>('aad_obo') as AuthConfig
    );

    const upstreamAccessToken = await this.authService.getCachedBearerToken();

    if (!upstreamAccessToken)
      throw new TokenException(
        'Could not retrieve upstream access token in on-behalf-of flow!'
      );
    const res = await authClient.authenticateOBO(upstreamAccessToken);
    const token = res as Token;

    if (token) return token.access_token;

    const err = res as TokenError;
    throw new Error(err.error_description);
  }
}
