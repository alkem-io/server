import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config/dist';
import { PassportStrategy, AuthGuard } from '@nestjs/passport';
import { BearerStrategy } from 'passport-azure-ad';
import aadConfig from '../config/aad.config';
import { IExtendedTokenPayload } from '../../interfaces/extended-token-payload.interface';
import { UserService } from '../../domain/user/user.service';

@Injectable()
export class AzureADStrategy extends PassportStrategy(
  BearerStrategy,
  'azure-ad',
) {
  constructor(
    @Inject(aadConfig.KEY)
    private azureConfig: ConfigType<typeof aadConfig>,
    private userService: UserService,
  ) {
    super(
      //   //toDo fix this
      {
        identityMetadata:
          'https://login.microsoftonline.com/22e3aada-5a09-4e2b-9e0e-dc4f02328b29/v2.0/.well-known/openid-configuration',
        clientID: '869e0dc2-907e-45fe-841f-34cc93beee63',
        validateIssuer: true,
        passReqToCallback: true,
        issuer:
          'https://login.microsoftonline.com/22e3aada-5a09-4e2b-9e0e-dc4f02328b29/v2.0',
        audience: '869e0dc2-907e-45fe-841f-34cc93beee63',
        allowMultiAudiencesInToken: false,
        loggingLevel: 'debug',
        scope: ['Cherrytwist-GraphQL'],
        loggingNoPII: false,
      },
    );
  }

  async validate(
    _req: Request,
    token: IExtendedTokenPayload,
    done: CallableFunction,
  ): Promise<any> {
    try {
      if (!token.email) throw 'token email missing';

      const knownUser = await this.userService.findUserByEmail(token.email);
      if (knownUser) return done(null, knownUser, token);

      throw new UnauthorizedException();
    } catch (error) {
      console.error(`Failed adding the user to the request object: ${error}`);
      done(new Error(`Failed adding the user to the request object: ${error}`));
    }
  }
}

export const AzureADGuard = AuthGuard('azure-ad');
