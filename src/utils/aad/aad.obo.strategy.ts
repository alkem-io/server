import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import { Inject, Injectable, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuthConfig,
  AadAuthenticationClient,
  Token,
  TokenError,
} from '@cmdbg/tokenator';
import { TokenException } from '@utils/error-handling/exceptions';
import { CONTEXT } from '@nestjs/graphql';

@Injectable({ scope: Scope.DEFAULT })
export class AadOboStrategy implements AuthenticationProvider {
  constructor(
    private configService: ConfigService // @Inject(CONTEXT) private readonly context: any
  ) {}

  async getAccessToken(): Promise<string> {
    const authClient = new AadAuthenticationClient(
      () => this.configService.get<AuthConfig>('aad_obo') as AuthConfig
    );

    const upstreamAccessToken = await this.getBearerToken();

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

  async getBearerToken(): Promise<string> {
    // const { req } = this.context as any;
    // if (!req.headers.authorization)
    //   throw new TokenException('Trying to access OBO flow unauthenticated!');

    // const [{}, token] = req.headers.authorization.split(' ');
    // return token;
    return '';
  }
}
