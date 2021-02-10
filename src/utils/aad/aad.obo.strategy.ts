import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import { Injectable } from '@nestjs/common';
import { AadAuthenticationClient, Token, TokenError } from '@cmdbg/tokenator';
import { TokenException } from '@utils/error-handling/exceptions';

@Injectable()
export class AadOboStrategy implements AuthenticationProvider {
  constructor(
    private authClient: AadAuthenticationClient,
    private context: any
  ) {}

  async getAccessToken(): Promise<string> {
    const upstreamAccessToken = await this.getBearerToken();

    if (!upstreamAccessToken)
      throw new TokenException(
        'Could not retrieve upstream access token in on-behalf-of flow!'
      );
    const res = await this.authClient.authenticateOBO(upstreamAccessToken);
    const token = res as Token;

    if (token) return token.access_token;

    const err = res as TokenError;
    throw new Error(err.error_description);
  }

  async getBearerToken(): Promise<string> {
    // const req = getRequest();
    return '';
    // const { req } = this.context as any;
    // if (!req.headers.authorization)
    //   throw new TokenException('Trying to access OBO flow unauthenticated!');

    // const [{}, token] = req.headers.authorization.split(' ');
    // return token;
  }
}
