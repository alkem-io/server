import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard, PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  Client,
  UserinfoResponse,
  TokenSet,
  Issuer,
} from 'openid-client';
import { AuthService } from './auth.service';

export const buildOpenIdClient = async () => {
  // const metadataDocumentEndpoint = `${process.env.OAUTH2_CLIENT_PROVIDER_OIDC_ISSUER}/.well-known/openid-configuration`;
  const metadataDocumentEndpoint =
    'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration';
  try {
    const TrustIssuer = await Issuer.discover(metadataDocumentEndpoint);
    const client = new TrustIssuer.Client({
      client_id: process.env.OAUTH2_CLIENT_REGISTRATION_LOGIN_CLIENT_ID || '',
      client_secret: process.env.OAUTH2_CLIENT_REGISTRATION_LOGIN_CLIENT_SECRET,
    });
    return client;
  } catch (error) {
    throw Error('Could not connect to OIDC provider!');
  }
};

export class OidcStrategy extends PassportStrategy(Strategy, 'oidc') {
  client: Client;

  constructor(private readonly authService: AuthService, client: Client) {
    super({
      client: client,
      params: {
        redirect_uri: process.env.OAUTH2_CLIENT_REGISTRATION_LOGIN_REDIRECT_URI,
        scope: ['openid', 'profile', 'offline_access'],
      },
      passReqToCallback: true,
      usePKCE: false,
    });

    this.client = client;
  }

  async validate(tokenset: TokenSet): Promise<any> {
    const userinfo: UserinfoResponse = await this.client.userinfo(tokenset);

    try {
      const id_token = tokenset.id_token;
      const access_token = tokenset.access_token;
      const refresh_token = tokenset.refresh_token;
      const user = {
        id_token,
        access_token,
        refresh_token,
        userinfo,
      };
      return user;
    } catch (err) {
      throw new UnauthorizedException();
    }
  }

  async getCachedBearerToken(): Promise<string> {
    // const accessToken = await this.myCache.get('accessToken');
    // return accessToken as string;
    return '';
  }
}

export const AzureADGuard = AuthGuard('oidc');

// @Injectable()
// export class OidcStrategy extends PassportStrategy(Strategy, 'oidc') {
//   myCache = new NodeCache({ stdTTL: 100, checkperiod: 120 });

//   constructor(
//     private configService: ConfigService,
//     @Inject(forwardRef(() => UserService))
//     private userService: UserService,
//     @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
//   ) {
//     super({
//       ...configService.get<IAzureADConfig>('aad'),
//       scope: ['Cherrytwist-GraphQL'],
//     });
//   }

//   async validate(
//     req: Request,
//     token: IExtendedTokenPayload,
//     done: CallableFunction
//   ): Promise<any> {
//     try {
//       if (!token.email)
//         throw new AuthenticationException('Token email missing!');

//       await this.cacheBearerToken(req);

//       const knownUser = await this.userService.getUserWithGroups(token.email);
//       if (!knownUser)
//         throw new AuthenticationException(
//           `No user with email ${token.email} found!`
//         );

//       return done(null, knownUser, token);
//     } catch (error) {
//       this.logger.error(
//         `Failed adding the user to the request object: ${error}`,
//         error,
//         LogContext.AUTH
//       );
//       done(
//         new AuthenticationException(
//           `Failed adding the user to the request object: ${error}`
//         )
//       );
//     }
//   }

//   //in-memory cache for the Bearer token so it can be shared between requests
//   private async cacheBearerToken(request: Request) {
//     try {
//       const headers = JSON.stringify(request.headers);
//       const parsedHeaders = JSON.parse(headers);
//       await this.myCache.set(
//         'accessToken',
//         parsedHeaders.authorization.split(' ')[1],
//         60
//       );
//     } catch (error) {
//       throw new TokenException(
//         `Failed adding the user to the request object: ${error}`
//       );
//     }
//   }

//   async getCachedBearerToken(): Promise<string> {
//     const accessToken = await this.myCache.get('accessToken');
//     return accessToken as string;
//   }
// }

// export const AzureADGuard = AuthGuard('azure-ad');
