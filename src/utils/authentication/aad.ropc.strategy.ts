import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuthConfig,
  AuthenticationClient,
  Token,
  TokenError,
} from 'cherrytwist-lib';

@Injectable()
export class AadRopcStrategy {
  constructor(private configService: ConfigService) {}

  async getAccessToken(): Promise<string> {
    const authClient = new AuthenticationClient(
      () => this.configService.get<AuthConfig>('aad_ropc') as AuthConfig
    );
    const res = await authClient.authenticateROPC();
    const token = res as Token;

    if (token) return token.access_token;

    const err = res as TokenError;
    throw new Error(err.error_description);
  }

  async getAccessTokenForUser(
    username: string,
    password: string
  ): Promise<string> {
    const authConfig = {
      clientID: this.configService.get<AuthConfig>('aad_ropc')
        ?.clientID as string,
      clientSecret: '',
      tenant: this.configService.get<AuthConfig>('aad_ropc')?.tenant as string,
      scope: this.configService.get<AuthConfig>('aad_ropc')?.scope as string,
      username: username,
      password: password,
    };

    const authClient = new AuthenticationClient(() => authConfig);
    const res = await authClient.authenticateROPC();
    const token = res as Token;

    if (token) return token.access_token;

    const err = res as TokenError;
    throw new Error(err.error_description);
  }
}
