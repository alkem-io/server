import {
  BadRequestHttpException,
  NotFoundHttpException,
} from '@common/exceptions/http';
import { LogContext } from '@common/enums';
import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  UserAlreadyRegisteredException,
  UserRegistrationInvalidEmail,
} from '@common/exceptions';
import { UserNotVerifiedException } from '@common/exceptions/user/user.not.verified.exception';
import { IdentityResolveRequestMeta } from './types/identity-resolve.request-meta';
import { UserIdentityService } from '@domain/community/user-identity';

@Injectable()
export class IdentityResolveService {
  constructor(
    private readonly userIdentityService: UserIdentityService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async resolveActorId(
    authenticationId: string,
    meta: IdentityResolveRequestMeta
  ): Promise<string> {
    let result;
    try {
      result = await this.userIdentityService.resolveByAuthenticationId(
        authenticationId,
        { assignToOrgByDomain: true }
      );
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

    if (!result) {
      this.logger.warn?.(
        `Identity resolve: no Kratos identity found for authenticationId=${authenticationId} (ip=${meta.ip ?? 'unknown'})`,
        LogContext.AUTH
      );
      throw new NotFoundHttpException(
        `Kratos identity '${authenticationId}' not found`,
        LogContext.AUTH
      );
    }

    const user = result.user;

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
      `Identity resolve: ${result.outcome} user ${user.id} for authenticationId=${authenticationId} (ip=${meta.ip ?? 'unknown'})`,
      LogContext.AUTH
    );

    return user.id;
  }
}
