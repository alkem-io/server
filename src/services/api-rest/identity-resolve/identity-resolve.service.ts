import {
  BadRequestHttpException,
  NotFoundHttpException,
} from '@common/exceptions/http';
import { LogContext } from '@common/enums';
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
    const existingUser =
      await this.userLookupService.getUserByAuthenticationID(authenticationId);
    if (existingUser) {
      this.logger.log?.(
        `Identity resolve: returning existing user ${existingUser.id} for authenticationId=${authenticationId} (ip=${meta.ip ?? 'unknown'})`,
        LogContext.AUTH
      );
      return existingUser;
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

    const agentInfo = this.buildAgentInfo(identity, authenticationId);

    const existingUserByEmail = await this.userLookupService.getUserByEmail(
      agentInfo.email
    );

    const outcome = existingUserByEmail ? 'link' : 'create';

    try {
      const user = await this.registrationService.registerNewUser(agentInfo);

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
      return user;
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
  ): AgentInfo {
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

    agentInfo.email = email.toLowerCase();
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
    agentInfo.emailVerified = Array.isArray(oryIdentity.verifiable_addresses)
      ? oryIdentity.verifiable_addresses.some(
          address => address?.via === 'email' && address?.verified
        )
      : false;

    return agentInfo;
  }
}
