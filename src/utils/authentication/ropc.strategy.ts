import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuthConfig,
  AuthenticationClient,
  Token,
  TokenError,
} from 'cherrytwist-lib';

@Injectable()
export class RopcStrategy {
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
}
