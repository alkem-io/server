import {
  Inject,
  Injectable,
  InternalServerErrorException,
  LoggerService,
  ServiceUnavailableException,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { RegistrationService } from '@services/api/registration/registration.service';
import { UserService } from '@domain/community/user/user.service';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { randomUUID } from 'node:crypto';
import { LogContext } from '@common/enums';
import { UserIdentityNotFoundException } from '@common/exceptions/user/user.identity.not.found.exception';
import { DuplicateAuthIdException } from '@common/exceptions/user/duplicate.authid.exception';
import type { Identity } from '@ory/kratos-client';
import type { OryDefaultIdentitySchema } from '@services/infrastructure/kratos/types/ory.default.identity.schema';

export interface IdentityResolutionResult {
  userId: string;
  created: boolean;
  auditId: string;
}

export interface IdentityResolutionContext {
  correlationId?: string;
}

export enum IdentityResolutionFailureReason {
  IDENTITY_NOT_FOUND = 'identity_not_found',
  DUPLICATE_AUTH_ID = 'identity_duplicate',
  KRATOS_UNAVAILABLE = 'kratos_unavailable',
  UNEXPECTED = 'unexpected_error',
}

export abstract class IdentityResolutionMetrics {
  abstract recordLookupHit(result: IdentityResolutionResult): void;
  abstract recordProvision(result: IdentityResolutionResult): void;
  abstract recordFailure(reason: IdentityResolutionFailureReason): void;
}

@Injectable()
export class IdentityResolutionService {
  constructor(
    private readonly userLookupService: UserLookupService,
    private readonly registrationService: RegistrationService,
    private readonly userService: UserService,
    private readonly kratosService: KratosService,
    private readonly authenticationService: AuthenticationService,
    private readonly metrics: IdentityResolutionMetrics,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async resolveIdentity(
    kratosIdentityId: string,
    context?: IdentityResolutionContext
  ): Promise<IdentityResolutionResult> {
    const auditId = context?.correlationId ?? randomUUID();
    this.logger.debug?.(
      `Identity resolution requested for Kratos identity ${kratosIdentityId} (auditId=${auditId})`,
      LogContext.AUTH
    );

    const existingUser =
      await this.userLookupService.getUserByAuthId(kratosIdentityId);
    if (existingUser) {
      const result: IdentityResolutionResult = {
        auditId,
        created: false,
        userId: existingUser.id,
      };

      this.metrics.recordLookupHit(result);
      this.logger.log?.(
        `Identity resolution hit existing user ${existingUser.id} (auditId=${auditId})`,
        LogContext.COMMUNITY
      );
      return result;
    }

    let identity: Identity | undefined;
    try {
      identity = await this.kratosService.getIdentityById(kratosIdentityId);
    } catch (error) {
      this.metrics.recordFailure(
        IdentityResolutionFailureReason.KRATOS_UNAVAILABLE
      );
      this.logger.error?.(
        `Kratos identity lookup failed for ${kratosIdentityId} (auditId=${auditId})`,
        error instanceof Error ? error.stack : undefined,
        LogContext.AUTH
      );
      throw new ServiceUnavailableException(
        'Kratos identity lookup failed. Please retry.'
      );
    }

    if (!identity) {
      this.metrics.recordFailure(
        IdentityResolutionFailureReason.IDENTITY_NOT_FOUND
      );
      this.logger.warn?.(
        `Kratos identity ${kratosIdentityId} not found (auditId=${auditId})`,
        LogContext.AUTH
      );
      throw new UserIdentityNotFoundException(
        `Kratos identity ${kratosIdentityId} not found`,
        LogContext.AUTH
      );
    }

    let agentInfo;
    try {
      agentInfo = await this.authenticationService.createAgentInfo(
        identity as OryDefaultIdentitySchema
      );
    } catch (error) {
      this.metrics.recordFailure(IdentityResolutionFailureReason.UNEXPECTED);
      this.logger.error?.(
        `Failed to build agent info for identity ${kratosIdentityId} (auditId=${auditId})`,
        error instanceof Error ? error.stack : undefined,
        LogContext.AUTH
      );
      throw error;
    }

    let user;
    try {
      user = await this.registrationService.registerNewUser(agentInfo);
      // Note: registerNewUser -> createUserFromAgentInfo already assigns authId internally
    } catch (error) {
      this.metrics.recordFailure(IdentityResolutionFailureReason.UNEXPECTED);
      this.logger.error?.(
        `Registration failed while provisioning user from identity ${kratosIdentityId} (auditId=${auditId})`,
        error instanceof Error ? error.stack : undefined,
        LogContext.COMMUNITY
      );
      throw error;
    }

    const result: IdentityResolutionResult = {
      auditId,
      created: true,
      userId: user.id,
    };

    this.metrics.recordProvision(result);
    this.logger.log?.(
      `Identity resolution provisioned user ${user.id} for Kratos identity ${kratosIdentityId} (auditId=${auditId})`,
      LogContext.COMMUNITY
    );
    return result;
  }
}
