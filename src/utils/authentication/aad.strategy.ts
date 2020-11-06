import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config/dist';
import { PassportStrategy, AuthGuard } from '@nestjs/passport';
import { BearerStrategy } from 'passport-azure-ad';
import { IExtendedTokenPayload } from '../../interfaces/extended-token-payload.interface';
import { UserService } from '../../domain/user/user.service';
import { IAzureADConfig } from '../../interfaces/aad.config.interface';
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import fetch, { RequestInit, Headers } from 'node-fetch';
import { URLSearchParams } from 'url';
import NodeCache from 'node-cache';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class AzureADStrategy
  extends PassportStrategy(BearerStrategy, 'azure-ad')
  implements AuthenticationProvider {
  myCache = new NodeCache({ stdTTL: 100, checkperiod: 120 });

  constructor(
    private configService: ConfigService,
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger
  ) {
    super({
      identityMetadata: configService.get<IAzureADConfig>('aad')
        ?.identityMetadata,
      clientID: configService.get<IAzureADConfig>('aad')?.clientID,
      validateIssuer: configService.get<IAzureADConfig>('aad')?.validateIssuer,
      passReqToCallback: configService.get<IAzureADConfig>('aad')
        ?.passReqToCallback,
      issuer: configService.get<IAzureADConfig>('aad')?.issuer,
      audience: configService.get<IAzureADConfig>('aad')?.audience,
      allowMultiAudiencesInToken: configService.get<IAzureADConfig>('aad')
        ?.allowMultiAudiencesInToken,
      loggingLevel: configService.get<IAzureADConfig>('aad')?.loggingLevel,
      scope: ['Cherrytwist-GraphQL'],
      loggingNoPII: configService.get<IAzureADConfig>('aad')?.loggingNoPII,
    });
  }

  async validate(
    req: Request,
    token: IExtendedTokenPayload,
    done: CallableFunction
  ): Promise<any> {
    try {
      if (!token.email) throw new Error('Token email missing!');

      await this.cacheBearerToken(req);

      const knownUser = await this.userService.getUserWithGroups(token.email);
      if (!knownUser)
        throw new UnauthorizedException(
          `No user with email ${token.email} found!`
        );

      return done(null, knownUser, token);
    } catch (error) {
      this.logger.error(
        `Failed adding the user to the request object: ${error}`
      );
      done(new Error(`Failed adding the user to the request object: ${error}`));
    }
  }

  //in-memory cache for the Bearer token so it can be shared between requests
  private async cacheBearerToken(request: Request) {
    try {
      const headers = JSON.stringify(request.headers);
      const parsedHeaders = JSON.parse(headers);
      await this.myCache.set('accessToken', parsedHeaders.authorization, 60);
    } catch (error) {
      this.logger.error(
        `Failed adding the user to the request object: ${error}`
      );
    }
  }

  private async getCachedBearerToken(): Promise<string> {
    const accessToken = await this.myCache.get('accessToken');
    return accessToken as string;
  }

  //We are not using MSAL and Passport.JS AAD library doesn't have OBO Strategy so we acquire the token required by the resource API ourselves.
  //https://github.com/microsoftgraph/msgraph-sdk-javascript/blob/HEAD/docs/CustomAuthenticationProvider.md
  public async getAccessToken(): Promise<string> {
    const upstreamAccessToken = await this.getCachedBearerToken();
    const response = await this.getDownstreamAccessToken(upstreamAccessToken);
    const downstreamAccessToken = response['access_token'] as string;
    this.logger.verbose(`Downstream access token: ${downstreamAccessToken}`);

    return downstreamAccessToken;
  }

  //We are triggering OBO flow - https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-authentication-flows#on-behalf-of
  //Credits to: https://github.com/Azure-Samples/ms-identity-nodejs-webapi-onbehalfof-azurefunctions/blob/master/Function/MyHttpTrigger/index.js
  async getDownstreamAccessToken(userToken: string) {
    const [bearer, tokenValue] = userToken.split(' ');
    this.logger.verbose(`Upstream access token: ${bearer} ${tokenValue}`);

    const authority = 'login.microsoftonline.com';
    const tenant = this.configService.get<IAzureADConfig>('aad')?.tenant;
    const tokenEndpoint = `https://${authority}/${tenant}/oauth2/v2.0/token`;

    const myHeaders = new Headers();
    myHeaders.append('Content-Type', 'application/x-www-form-urlencoded');

    const urlencoded = new URLSearchParams();
    urlencoded.append(
      'grant_type',
      'urn:ietf:params:oauth:grant-type:jwt-bearer'
    );
    urlencoded.append(
      'client_id',
      this.configService.get<IAzureADConfig>('ms-graph')?.clientID as string
    );
    urlencoded.append(
      'client_secret',
      this.configService.get<IAzureADConfig>('ms-graph')?.clientSecret as string
    );
    urlencoded.append('assertion', tokenValue);
    urlencoded.append(
      'scope',
      this.configService.get<IAzureADConfig>('ms-graph')?.scope as string
    );
    urlencoded.append('requested_token_use', 'on_behalf_of');

    const options: RequestInit = {
      method: 'POST',
      headers: myHeaders,
      body: urlencoded,
      redirect: 'follow',
    };

    const response = await fetch(tokenEndpoint, options);
    const json = response.json();
    return json;
  }
}

export const AzureADGuard = AuthGuard('azure-ad');
