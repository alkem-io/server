import {
  BadRequestHttpException,
  NotFoundHttpException,
} from '@common/exceptions/http';
import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { RegistrationService } from '@services/api/registration/registration.service';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { IUser } from '@domain/community/user/user.interface';
import {
  UserAlreadyRegisteredException,
  UserRegistrationInvalidEmail,
} from '@common/exceptions';
import { UserNotVerifiedException } from '@common/exceptions/user/user.not.verified.exception';
import { IdentityResolveRequestMeta } from './types/identity-resolve.request-meta';
import { AgentInfoService } from '@core/authentication.agent.info/agent.info.service';

@Injectable()
export class IdentityResolveService {
  constructor(
    private readonly registrationService: RegistrationService,
    private readonly kratosService: KratosService,
    private readonly userLookupService: UserLookupService,
    private readonly agentInfoService: AgentInfoService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async resolveUser(
    authenticationId: string,
    meta: IdentityResolveRequestMeta
  ): Promise<IUser> {
    const existingUser = await this.userLookupService.getUserByAuthenticationID(
      authenticationId,
      {
        relations: {
          agent: true,
        },
      }
    );
    if (existingUser) {
      this.logger.log?.(
        `Identity resolve: returning existing user ${existingUser.id} for authenticationId=${authenticationId} (ip=${meta.ip ?? 'unknown'})`,
        LogContext.AUTH
      );
      return this.ensureAgentOrFail(existingUser, authenticationId);
    }

    const identity = await this.kratosService.getIdentityById(authenticationId);
    if (!identity) {
      this.logger.warn?.(
        `Identity resolve: no Kratos identity found for authenticationId=${authenticationId} (ip=${meta.ip ?? 'unknown'})`,
        LogContext.AUTH
      );
      throw new NotFoundHttpException(
        `Kratos identity '${authenticationId}' not found`,
        LogContext.AUTH
      );
    }

    const agentInfo = this.agentInfoService.buildAgentInfoFromOryIdentity(
      identity,
      { authenticationId }
    );

    // Validate email is present (required for registration)
    if (!agentInfo.email) {
      this.logger.warn?.(
        `Identity resolve: Kratos identity ${identity.id} missing email trait`,
        LogContext.AUTH
      );
      throw new BadRequestHttpException(
        `Kratos identity '${identity.id}' is missing an email address`,
        LogContext.AUTH
      );
    }

    // Log warning if identity.id doesn't match authenticationId
    if (identity.id !== authenticationId) {
      this.logger.warn?.(
        `Identity resolve: Kratos identity ${identity.id} does not match requested authenticationId=${authenticationId}`,
        LogContext.AUTH
      );
    }

    const existingUserByEmail = await this.userLookupService.getUserByEmail(
      agentInfo.email
    );

    const outcome = existingUserByEmail ? 'link' : 'create';

    // FIXME: temporary ugly workaround to skip email verification for Kratos users,
    //  based on the fact that this EP is called only by OIDC controller, so we silently assume
    //  that this is OIDC session and don't care about email verification status from Kratos side.
    // depending on future development and use of this EP we will need to either provide token/session
    //  info here to verify that this is indeed OIDC session, or get list of sessions for user to deduct
    //  that one of sessions is OIDC based, so we can skip email verification.
    agentInfo.emailVerified = true;

    let user: IUser;
    try {
      user = await this.registrationService.registerNewUser(agentInfo);
    } catch (error) {
      if (error instanceof UserAlreadyRegisteredException) {
        throw new BadRequestHttpException(error.message, LogContext.AUTH);
      }
      if (error instanceof UserNotVerifiedException) {
        throw new BadRequestHttpException(
          'Kratos identity email is not verified',
          LogContext.AUTH
        );
      }
      if (error instanceof UserRegistrationInvalidEmail) {
        throw new BadRequestHttpException(error.message, LogContext.AUTH);
      }
      this.logger.error?.(
        `Identity resolve: failed to resolve authenticationId=${authenticationId}: ${(error as Error)?.message}`,
        (error as Error)?.stack,
        LogContext.AUTH
      );
      throw error;
    }

    if (!user.authenticationID) {
      this.logger.error?.(
        `Identity resolve: registration flow completed but authenticationID missing for user ${user.id} (expected ${authenticationId})`,
        LogContext.AUTH
      );
      throw new BadRequestHttpException(
        'Resolved user missing authentication ID after registration',
        LogContext.AUTH
      );
    }

    this.logger.log?.(
      `Identity resolve: ${outcome} user ${user.id} for authenticationId=${authenticationId} (ip=${meta.ip ?? 'unknown'})`,
      LogContext.AUTH
    );

    const userWithAgent = await this.userLookupService.getUserOrFail(user.id, {
      relations: { agent: true },
    });
    return this.ensureAgentOrFail(userWithAgent, authenticationId);
  }

  private ensureAgentOrFail(user: IUser, authenticationId: string): IUser {
    if (!user.agent) {
      this.logger.warn?.(
        `Identity resolve: user ${user.id} has no agent linked for authenticationId=${authenticationId}`,
        LogContext.AUTH
      );
      throw new NotFoundHttpException(
        `Agent not found for user ${user.id}`,
        LogContext.AUTH,
        AlkemioErrorStatus.NO_AGENT_FOR_USER
      );
    }

    return user;
  }
}
