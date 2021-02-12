import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import { Injectable } from '@nestjs/common';
import { AadAuthenticationClient, Token, TokenError } from '@cmdbg/tokenator';
import { TokenException } from '@utils/error-handling/exceptions';

@Injectable()
export class AadOboStrategy implements AuthenticationProvider {
  private _upstreamAccessToken!: string;
  public get upstreamAccessToken(): string {
    return this._upstreamAccessToken;
  }
  public set upstreamAccessToken(value: string) {
    this._upstreamAccessToken = value;
  }

  constructor(private authClient: AadAuthenticationClient) {}

  async getAccessToken(): Promise<string> {
    if (!this.upstreamAccessToken)
      throw new TokenException(
        'Could not retrieve upstream access token in on-behalf-of flow!'
      );
    const res = await this.authClient.authenticateOBO(this.upstreamAccessToken);
    const token = res as Token;

    if (token) return token.access_token;

    const err = res as TokenError;
    throw new Error(err.error_description);
  }
}
