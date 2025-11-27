import {
  BadRequestHttpException,
  NotFoundHttpException,
} from '@common/exceptions/http';
import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { RegistrationService } from '@services/api/registration/registration.service';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Identity } from '@ory/kratos-client';
import { OryDefaultIdentitySchema } from '@services/infrastructure/kratos/types/ory.default.identity.schema';
import { IUser } from '@domain/community/user/user.interface';
import {
  UserAlreadyRegisteredException,
  UserRegistrationInvalidEmail,
} from '@common/exceptions';
import { UserNotVerifiedException } from '@common/exceptions/user/user.not.verified.exception';
import { IdentityResolveRequestMeta } from './types/identity-resolve.request-meta';
import { Session } from '@ory/kratos-client';

@Injectable()
export class IdentityResolveService {
  constructor(
    private readonly registrationService: RegistrationService,
    private readonly kratosService: KratosService,
    private readonly userLookupService: UserLookupService,
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

    const { agentInfo, email } = this.buildAgentInfo(identity, authenticationId);

    const existingUserByEmail = await this.userLookupService.getUserByEmail(
      email
    );

    const outcome = existingUserByEmail ? 'link' : 'create';

    try {
      // FIXME: temporary ugly workaround to skip email verification for Kratos users,
      //  based on the fact that this EP is called only by OIDC controller, so we silently assume
      //  that this is OIDC session and don't care about email verification status from Kratos side.
      // depending on future development and use of this EP we will need to either provide token/session
      //  info here to verify that this is indeed OIDC session, or get list of sessions for user to deduct
      //  that one of sessions is OIDC based, so we can skip email verification.
      const emailVerified = true;

      const user = await this.registrationService.registerNewUser(
        agentInfo,
        email,
        emailVerified
      );

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
      const userWithAgent = await this.userLookupService.getUserOrFail(
        user.id,
        {
          relations: {
            agent: true,
          },
        }
      );
      return this.ensureAgentOrFail(userWithAgent, authenticationId);
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
  }

  private buildAgentInfo(
    identity: Identity,
    authenticationId: string
  ): { agentInfo: AgentInfo; email: string } {
    const agentInfo = new AgentInfo();
    const oryIdentity = identity as OryDefaultIdentitySchema;
    const traits = (oryIdentity.traits ?? {}) as Record<string, any>;

    const email =
      (traits.email as string | undefined) ??
      oryIdentity.verifiable_addresses?.[0]?.value ??
      '';

    if (!email) {
      this.logger.warn?.(
        `Identity resolve: Kratos identity ${identity.id} missing email trait`,
        LogContext.AUTH
      );
      throw new BadRequestHttpException(
        `Kratos identity '${identity.id}' is missing an email address`,
        LogContext.AUTH
      );
    }

    agentInfo.firstName = (traits?.name?.first as string) ?? '';
    agentInfo.lastName = (traits?.name?.last as string) ?? '';
    agentInfo.avatarURL = (traits?.picture as string) ?? '';
    if (identity.id !== authenticationId) {
      this.logger.warn?.(
        `Identity resolve: Kratos identity ${identity.id} does not match requested authenticationId=${authenticationId}`,
        LogContext.AUTH
      );
    }
    agentInfo.authenticationID = authenticationId;

    return { agentInfo, email: email.toLowerCase() };
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
