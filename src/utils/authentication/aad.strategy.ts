import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config/dist';
import { PassportStrategy, AuthGuard } from '@nestjs/passport';
import { BearerStrategy } from 'passport-azure-ad';
import { IExtendedTokenPayload } from '../../interfaces/extended-token-payload.interface';
import { UserService } from '../../domain/user/user.service';
import { IAzureADConfig } from 'src/interfaces/aad.config.interface';

@Injectable()
export class AzureADStrategy extends PassportStrategy(
  BearerStrategy,
  'azure-ad'
) {
  constructor(
    private configService: ConfigService,
    private userService: UserService
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
    _req: Request,
    token: IExtendedTokenPayload,
    done: CallableFunction
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
