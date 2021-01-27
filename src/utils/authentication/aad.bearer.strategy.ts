// import { forwardRef, Inject, Injectable, LoggerService } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config/dist';
// import { PassportStrategy, AuthGuard } from '@nestjs/passport';
// import { BearerStrategy } from 'passport-azure-ad';
// import { IExtendedTokenPayload } from '../../interfaces/extended-token-payload.interface';
// import { UserService } from '../../domain/user/user.service';
// import { IAzureADConfig } from '../../interfaces/aad.config.interface';
// import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
// import { LogContext } from '../logging/logging.contexts';
// import { AuthenticationException } from '../error-handling/exceptions/authentication.exception';
// import { TokenException } from '../error-handling/exceptions/token.exception';
// import NodeCache from 'node-cache';

// @Injectable()
// export class AadBearerStrategy extends PassportStrategy(
//   BearerStrategy,
//   'azure-ad'
// ) {
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
