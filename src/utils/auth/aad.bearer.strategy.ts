import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config/dist';
import { PassportStrategy } from '@nestjs/passport';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Strategy } from 'passport-http-bearer';
import { AuthenticationException } from '@utils/error-handling/exceptions';
import { IOidcConfig } from '@interfaces/oidc.config.interface';
import { AuthService } from './auth.service';
import { ITokenPayload } from 'passport-azure-ad';

@Injectable()
export class OidcBearerStrategy extends PassportStrategy(Strategy, 'azure-ad') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    super({
      ...configService.get<IOidcConfig>('oidc'),
    });
  }

  async validate(
    _req: Request,
    token: IExtendedTokenPayload,
    done: CallableFunction
  ): Promise<any> {
    const email = token.email;

    try {
      if (!email)
        throw new AuthenticationException(
          'Email claim missing from JWT token!'
        );

      const knownUser = await this.authService.getUserProfile(email);

      return done(null, knownUser, token);
    } catch (error) {
      done(
        new AuthenticationException(
          `Failed adding the user to the request object: ${error}`
        )
      );
    }
  }
}

interface IExtendedTokenPayload extends ITokenPayload {
  /** User email. */
  email?: string;
}
