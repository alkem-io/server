import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  LoginChallengeResponseDto,
  ConsentChallengeResponseDto,
  AcceptLoginRequestDto,
  AcceptConsentRequestDto,
  HydraRedirectResponseDto,
  LogoutChallengeResponseDto,
} from './dto/oidc.dto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums/logging.context';
import { AlkemioConfig } from '@src/types';

@Injectable()
export class OidcService {
  private readonly hydraAdminUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    const oidcConfig = this.configService.get<
      AlkemioConfig['identity']['authentication']['providers']['oidc']
    >('identity.authentication.providers.oidc', {
      infer: true,
    });
    const base = oidcConfig?.hydra_admin_url;
    if (!base) {
      throw new Error(
        'identity.authentication.providers.oidc.hydra_admin_url is not configured'
      );
    }
    this.hydraAdminUrl = this.trimTrailingSlash(base);
  }

  private trimTrailingSlash(value: string): string {
    return value.endsWith('/') ? value.slice(0, -1) : value;
  }

  async getLoginChallenge(
    challenge: string
  ): Promise<LoginChallengeResponseDto> {
    try {
      this.logger.debug?.(
        `Fetching login challenge from Hydra - challengeId: ${challenge}`,
        LogContext.OIDC
      );

      const response = await firstValueFrom(
        this.httpService.get<LoginChallengeResponseDto>(
          `${this.hydraAdminUrl}/admin/oauth2/auth/requests/login?login_challenge=${challenge}`
        )
      );
      return response.data;
    } catch (error: any) {
      this.logger.error?.(
        `Failed to fetch login challenge: ${error.message} - challengeId: ${challenge}, errorCode: HYDRA_GET_LOGIN_CHALLENGE_FAILED`,
        error.stack,
        LogContext.OIDC
      );
      throw error;
    }
  }

  async acceptLoginRequest(
    challenge: string,
    acceptBody: AcceptLoginRequestDto
  ): Promise<HydraRedirectResponseDto> {
    try {
      this.logger.debug?.(
        `Accepting login request in Hydra - challengeId: ${challenge}, subject: ${acceptBody.subject}`,
        LogContext.OIDC
      );

      const response = await firstValueFrom(
        this.httpService.put<HydraRedirectResponseDto>(
          `${this.hydraAdminUrl}/admin/oauth2/auth/requests/login/accept?login_challenge=${challenge}`,
          acceptBody
        )
      );
      return response.data;
    } catch (error: any) {
      this.logger.error?.(
        `Failed to accept login request: ${error.message} - challengeId: ${challenge}, errorCode: HYDRA_ACCEPT_LOGIN_FAILED`,
        error.stack,
        LogContext.OIDC
      );
      throw error;
    }
  }

  async getConsentChallenge(
    challenge: string
  ): Promise<ConsentChallengeResponseDto> {
    try {
      this.logger.debug?.(
        `Fetching consent challenge from Hydra - challengeId: ${challenge}`,
        LogContext.OIDC
      );

      const response = await firstValueFrom(
        this.httpService.get<ConsentChallengeResponseDto>(
          `${this.hydraAdminUrl}/admin/oauth2/auth/requests/consent?consent_challenge=${challenge}`
        )
      );
      return response.data;
    } catch (error: any) {
      this.logger.error?.(
        `Failed to fetch consent challenge: ${error.message} - challengeId: ${challenge}, errorCode: HYDRA_GET_CONSENT_CHALLENGE_FAILED`,
        error.stack,
        LogContext.OIDC
      );
      throw error;
    }
  }

  async acceptConsentRequest(
    challenge: string,
    acceptBody: AcceptConsentRequestDto
  ): Promise<HydraRedirectResponseDto> {
    try {
      this.logger.debug?.(
        `Accepting consent request in Hydra - challengeId: ${challenge}, grantedScopes: ${acceptBody.grant_scope?.join(',')}`,
        LogContext.OIDC
      );

      const response = await firstValueFrom(
        this.httpService.put<HydraRedirectResponseDto>(
          `${this.hydraAdminUrl}/admin/oauth2/auth/requests/consent/accept?consent_challenge=${challenge}`,
          acceptBody
        )
      );
      return response.data;
    } catch (error: any) {
      this.logger.error?.(
        `Failed to accept consent request: ${error.message} - challengeId: ${challenge}, errorCode: HYDRA_ACCEPT_CONSENT_FAILED`,
        error.stack,
        LogContext.OIDC
      );
      throw error;
    }
  }

  async getLogoutChallenge(
    challenge: string
  ): Promise<LogoutChallengeResponseDto> {
    try {
      this.logger.debug?.(
        `Fetching logout challenge from Hydra - challengeId: ${challenge}`,
        LogContext.OIDC
      );

      const response = await firstValueFrom(
        this.httpService.get<LogoutChallengeResponseDto>(
          `${this.hydraAdminUrl}/admin/oauth2/auth/requests/logout?logout_challenge=${challenge}`
        )
      );
      return response.data;
    } catch (error: any) {
      this.logger.error?.(
        `Failed to fetch logout challenge: ${error.message} - challengeId: ${challenge}, errorCode: HYDRA_GET_LOGOUT_CHALLENGE_FAILED`,
        error.stack,
        LogContext.OIDC
      );
      throw error;
    }
  }

  async acceptLogoutRequest(
    challenge: string
  ): Promise<HydraRedirectResponseDto> {
    try {
      this.logger.debug?.(
        `Accepting logout request in Hydra - challengeId: ${challenge}`,
        LogContext.OIDC
      );

      const response = await firstValueFrom(
        this.httpService.put<HydraRedirectResponseDto>(
          `${this.hydraAdminUrl}/admin/oauth2/auth/requests/logout/accept?logout_challenge=${challenge}`,
          {}
        )
      );
      return response.data;
    } catch (error: any) {
      this.logger.error?.(
        `Failed to accept logout request: ${error.message} - challengeId: ${challenge}, errorCode: HYDRA_ACCEPT_LOGOUT_FAILED`,
        error.stack,
        LogContext.OIDC
      );
      throw error;
    }
  }
}
