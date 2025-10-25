import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  BadRequestException,
  InternalServerErrorException,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { OidcService } from './oidc.service';
import {
  LoginChallengeQueryDto,
  ConsentChallengeQueryDto,
  LogoutChallengeQueryDto,
} from './dto/oidc.dto';
import { OidcConfig } from './oidc.config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums/logging.context';
import { OidcLogoutService } from './oidc-logout.service';

@Controller('rest/oidc')
export class OidcController {
  constructor(
    private readonly oidcService: OidcService,
    private readonly oidcConfig: OidcConfig,
    private readonly oidcLogoutService: OidcLogoutService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  private trimTrailingSlash(value: string): string {
    return value.endsWith('/') ? value.slice(0, -1) : value;
  }

  @Get('logout')
  async handleLogoutChallenge(
    @Query() query: LogoutChallengeQueryDto,
    @Res() response: Response
  ) {
    const { logout_challenge } = query;
    const timestamp = new Date().toISOString();

    if (!logout_challenge) {
      throw new BadRequestException('logout_challenge parameter is required');
    }

    try {
      const logoutChallenge =
        await this.oidcService.getLogoutChallenge(logout_challenge);

      this.logger.debug?.(
        `Processing logout challenge - challengeId: ${logout_challenge}, subject: ${logoutChallenge.subject}, timestamp: ${timestamp}`,
        LogContext.OIDC
      );

      await this.oidcLogoutService
        .synchronizeMatrixSessions(logoutChallenge.subject)
        .catch(error => {
          const err = error as Error;
          this.logger.warn?.(
            `Matrix session synchronization failed during logout: ${err.message}`,
            LogContext.OIDC
          );
        });

      const acceptResponse =
        await this.oidcService.acceptLogoutRequest(logout_challenge);

      this.logger.log?.(
        `Logout accepted successfully - challengeId: ${logout_challenge}, subject: ${logoutChallenge.subject}, timestamp: ${timestamp}`,
        LogContext.OIDC
      );

      return response.redirect(acceptResponse.redirect_to);
    } catch (error: any) {
      if (error?.response?.status === 404 || error?.response?.status === 410) {
        throw new BadRequestException('Invalid logout challenge');
      }
      this.logger.error?.(
        `Error processing logout challenge: ${error.message} - challengeId: ${logout_challenge}, status: ${error.response?.status}, timestamp: ${timestamp}`,
        error.stack,
        LogContext.OIDC
      );

      throw new InternalServerErrorException(
        'Logout service temporarily unavailable. Please retry in 2-5 minutes.'
      );
    }
  }

  private ensureLeadingSlash(path: string): string {
    return path.startsWith('/') ? path : `/${path}`;
  }

  private joinUrl(base: string, path: string): string {
    const left = this.trimTrailingSlash(base);
    const right = this.ensureLeadingSlash(path);
    return `${left}${right}`;
  }

  private async getUserInfoFromKratosSession(
    cookie: string | undefined
  ): Promise<{
    email: string;
    given_name: string;
    family_name: string;
    emailVerified: boolean;
    identityId: string;
  } | null> {
    if (!cookie) {
      this.logger.warn?.('No Kratos session cookie provided', LogContext.OIDC);
      return null;
    }

    try {
      // Call Kratos whoami endpoint through Traefik using configured base
      const kratosWhoAmIUrl = this.joinUrl(
        this.joinUrl(
          this.oidcConfig.getWebBaseUrl(),
          this.oidcConfig.getKratosPublicBasePath()
        ),
        '/sessions/whoami'
      );
      this.logger.debug?.(
        `Calling Kratos whoami - url: ${kratosWhoAmIUrl}`,
        LogContext.OIDC
      );

      const response = await fetch(kratosWhoAmIUrl, {
        headers: {
          Cookie: `ory_kratos_session=${cookie}`,
        },
      });

      if (!response.ok) {
        this.logger.warn?.(
          `Kratos whoami failed - status: ${response.status}`,
          LogContext.OIDC
        );
        return null;
      }

      const session: any = await response.json();

      if (!session.identity) {
        this.logger.warn?.(
          'No identity data in Kratos session',
          LogContext.OIDC
        );
        return null;
      }

      const identity = session.identity;
      const traits = identity.traits;

      this.logger.debug?.(
        `Extracted identity from Kratos session - email: ${traits?.email || 'N/A'}`,
        LogContext.OIDC
      );

      const verifiableAddresses = identity.verifiable_addresses as
        | Array<{ value?: string; via?: string; verified?: boolean }>
        | undefined;

      const emailAddress = verifiableAddresses?.find(address => {
        if (!address) {
          return false;
        }
        if (address.value && traits?.email) {
          return address.value === traits.email;
        }
        return address.via === 'email';
      });

      return {
        email: traits.email,
        given_name: traits.name?.first || 'User',
        family_name: traits.name?.last || '',
        emailVerified: !!emailAddress?.verified,
        identityId: identity.id,
      };
    } catch (error: any) {
      this.logger.warn?.(
        `Failed to fetch user info from Kratos session: ${error.message}`,
        LogContext.OIDC
      );
      return null;
    }
  }

  @Get('login')
  async handleLoginChallenge(
    @Query() query: LoginChallengeQueryDto,
    @Req() request: Request,
    @Res() response: Response
  ) {
    const { login_challenge } = query;
    const timestamp = new Date().toISOString();

    if (!login_challenge) {
      throw new BadRequestException('login_challenge parameter is required');
    }

    try {
      // Fetch login challenge details from Hydra
      const loginChallenge =
        await this.oidcService.getLoginChallenge(login_challenge);

      this.logger.debug?.(
        `Processing login challenge - challengeId: ${login_challenge}, skip: ${loginChallenge.skip}, timestamp: ${timestamp}`,
        LogContext.OIDC
      );

      // If skip is true, accept the login immediately
      if (loginChallenge.skip) {
        this.logger.debug?.(
          `Login challenge skip=true - challengeId: ${login_challenge}, subject: ${loginChallenge.subject}, timestamp: ${timestamp}`,
          LogContext.OIDC
        );

        const acceptResponse = await this.oidcService.acceptLoginRequest(
          login_challenge,
          {
            subject: loginChallenge.subject,
            remember: true,
            remember_for: 3600,
          }
        );

        this.logger.log?.(
          `Login accepted (skip) - challengeId: ${login_challenge}, userId: ${loginChallenge.subject}, timestamp: ${timestamp}`,
          LogContext.OIDC
        );

        return response.redirect(acceptResponse.redirect_to);
      }

      // Check if user has Kratos session
      const kratosSession = request.cookies?.['ory_kratos_session'];

      this.logger.debug?.(
        `Checking Kratos session cookie - challengeId: ${login_challenge}, sessionPresent: ${!!kratosSession}, timestamp: ${timestamp}`,
        LogContext.OIDC
      );

      if (!kratosSession) {
        // No session, redirect to Kratos login via configured public path
        const returnTo = `${this.joinUrl(
          this.joinUrl(
            this.oidcConfig.getWebBaseUrl(),
            this.oidcConfig.getApiPublicBasePath()
          ),
          '/oidc/login'
        )}?login_challenge=${encodeURIComponent(login_challenge)}`;

        const kratosLoginUrl = `${this.joinUrl(
          this.joinUrl(
            this.oidcConfig.getWebBaseUrl(),
            this.oidcConfig.getKratosPublicBasePath()
          ),
          '/self-service/login/browser'
        )}?return_to=${encodeURIComponent(returnTo)}`;

        this.logger.debug?.(
          `Redirecting to Kratos login - challengeId: ${login_challenge}, kratosLoginUrl: ${kratosLoginUrl}, returnTo: ${returnTo}, timestamp: ${timestamp}`,
          LogContext.OIDC
        );

        return response.redirect(kratosLoginUrl);
      }

      // User has Kratos session cookie - try to get user info
      // Fetch user info from Kratos session
      this.logger.debug?.(
        `Fetching user info from Kratos session - challengeId: ${login_challenge}, timestamp: ${timestamp}`,
        LogContext.OIDC
      );

      const userInfo = await this.getUserInfoFromKratosSession(kratosSession);

      if (!userInfo?.email) {
        this.logger.warn?.(
          `Kratos session missing user email - challengeId: ${login_challenge}, timestamp: ${timestamp}`,
          LogContext.OIDC
        );

        const returnTo = `${this.joinUrl(
          this.joinUrl(
            this.oidcConfig.getWebBaseUrl(),
            this.oidcConfig.getApiPublicBasePath()
          ),
          '/oidc/login'
        )}?login_challenge=${encodeURIComponent(login_challenge)}`;

        const kratosLoginUrl = `${this.joinUrl(
          this.joinUrl(
            this.oidcConfig.getWebBaseUrl(),
            this.oidcConfig.getKratosPublicBasePath()
          ),
          '/self-service/login/browser'
        )}?return_to=${encodeURIComponent(returnTo)}`;

        this.logger.debug?.(
          `Redirecting back to Kratos login to refresh session - challengeId: ${login_challenge}, kratosLoginUrl: ${kratosLoginUrl}, timestamp: ${timestamp}`,
          LogContext.OIDC
        );

        return response.redirect(kratosLoginUrl);
      }

      const subject = userInfo.email;
      const context = {
        email: userInfo.email,
        given_name: userInfo.given_name,
        family_name: userInfo.family_name,
        email_verified: userInfo.emailVerified,
        kratos_identity_id: userInfo.identityId,
      };

      const acceptResponse = await this.oidcService.acceptLoginRequest(
        login_challenge,
        {
          subject,
          remember: true,
          remember_for: 3600,
          context,
        }
      );

      this.logger.log?.(
        `Login accepted successfully - challengeId: ${login_challenge}, userId: ${subject}, timestamp: ${timestamp}`,
        LogContext.OIDC
      );

      return response.redirect(acceptResponse.redirect_to);
    } catch (error: any) {
      const errorCode =
        error.response?.status === 404 ? 'INVALID_CHALLENGE' : 'HYDRA_ERROR';

      this.logger.error?.(
        `Error processing login challenge: ${error.message} - challengeId: ${login_challenge}, errorCode: ${errorCode}, status: ${error.response?.status}, timestamp: ${timestamp}`,
        error.stack,
        LogContext.OIDC
      );

      if (error.response?.status === 404) {
        throw new BadRequestException('Invalid login challenge');
      }

      throw new InternalServerErrorException(
        'Authentication service temporarily unavailable. Please retry in 2-5 minutes.'
      );
    }
  }

  @Get('consent')
  async handleConsentChallenge(
    @Query() query: ConsentChallengeQueryDto,
    @Res() response: Response
  ) {
    const { consent_challenge } = query;
    const timestamp = new Date().toISOString();

    if (!consent_challenge) {
      throw new BadRequestException('consent_challenge parameter is required');
    }

    try {
      // Fetch consent challenge details from Hydra
      const consentChallenge =
        await this.oidcService.getConsentChallenge(consent_challenge);

      this.logger.debug?.(
        `Processing consent challenge - challengeId: ${consent_challenge}, skip: ${consentChallenge.skip}, subject: ${consentChallenge.subject}, requestedScope: ${consentChallenge.requested_scope?.join(',')}, timestamp: ${timestamp}`,
        LogContext.OIDC
      );

      // Extract user info from the context that was passed during login
      const context = consentChallenge.context as any;
      const email = context?.email || consentChallenge.subject;
      const givenName = context?.given_name || 'User';
      const familyName = context?.family_name || '';
      const emailVerifiedFromContext = context?.email_verified;
      const emailVerified =
        typeof emailVerifiedFromContext === 'boolean'
          ? emailVerifiedFromContext
          : undefined;

      this.logger.debug?.(
        `Extracted user info for consent - challengeId: ${consent_challenge}, userId: ${email}, given_name: ${givenName}, timestamp: ${timestamp}`,
        LogContext.OIDC
      );

      // Auto-accept consent for trusted client (synapse-client)
      const acceptResponse = await this.oidcService.acceptConsentRequest(
        consent_challenge,
        {
          grant_scope: consentChallenge.requested_scope,
          remember: true,
          remember_for: 3600,
          session: {
            id_token: {
              email,
              given_name: givenName,
              family_name: familyName,
              ...(emailVerified !== undefined
                ? { email_verified: emailVerified }
                : {}),
            },
            access_token: {
              email: email,
              given_name: givenName,
              family_name: familyName,
            },
          },
        }
      );

      this.logger.log?.(
        `Consent accepted successfully - challengeId: ${consent_challenge}, userId: ${email}, scopes: ${consentChallenge.requested_scope?.join(',')}, timestamp: ${timestamp}`,
        LogContext.OIDC
      );

      return response.redirect(acceptResponse.redirect_to);
    } catch (error: any) {
      const errorCode =
        error.response?.status === 400
          ? 'INVALID_CONSENT_REQUEST'
          : 'HYDRA_ERROR';

      this.logger.error?.(
        `Error processing consent challenge: ${error.message} - challengeId: ${consent_challenge}, errorCode: ${errorCode}, status: ${error.response?.status}, timestamp: ${timestamp}`,
        error.stack,
        LogContext.OIDC
      );

      if (error.response?.status === 400) {
        throw new BadRequestException('Invalid consent request');
      }

      throw new InternalServerErrorException(
        'Authentication service temporarily unavailable. Please retry in 2-5 minutes.'
      );
    }
  }
}
