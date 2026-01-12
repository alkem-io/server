import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { User } from '@domain/community/user/user.entity';
import { LogContext } from '@common/enums';
import { UserAlreadyRegisteredException } from '@common/exceptions';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import {
  UserAuthenticationLinkConflictMode,
  UserAuthenticationLinkMatch,
  UserAuthenticationLinkOutcome,
  UserAuthenticationLinkResolveOptions,
  UserAuthenticationLinkResult,
} from './user.authentication.link.types';

@Injectable()
export class UserAuthenticationLinkService {
  constructor(
    private readonly userLookupService: UserLookupService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly kratosService: KratosService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async ensureAuthenticationIdAvailable(
    authenticationId: string,
    currentUserId?: string
  ): Promise<void> {
    await this.checkAuthenticationIdAvailability(
      authenticationId,
      currentUserId,
      'error'
    );
  }

  public async resolveExistingUser(
    agentInfo: AgentInfo,
    options?: UserAuthenticationLinkResolveOptions
  ): Promise<UserAuthenticationLinkResult | null> {
    const authId = agentInfo.authenticationID?.trim();
    const email = agentInfo.email?.trim().toLowerCase();
    const relations = options?.relations;
    const conflictMode: UserAuthenticationLinkConflictMode =
      options?.conflictMode ?? 'error';
    const lookupByAuthenticationId = options?.lookupByAuthenticationId ?? true;
    const lookupOptions = relations ? { relations } : undefined;

    if (!email) {
      return null;
    }

    if (lookupByAuthenticationId && authId) {
      const existingByAuth =
        await this.userLookupService.getUserByAuthenticationID(
          authId,
          lookupOptions
        );
      if (existingByAuth) {
        this.logger.verbose?.(
          `User ${existingByAuth.id} already linked to authentication ID ${authId}`,
          LogContext.AUTH
        );
        return {
          user: existingByAuth,
          matchedBy: UserAuthenticationLinkMatch.AUTHENTICATION_ID,
          outcome: UserAuthenticationLinkOutcome.ALREADY_LINKED,
        };
      }
    }

    const existingByEmail = await this.userLookupService.getUserByEmail(
      email,
      lookupOptions
    );

    if (!existingByEmail) {
      return null;
    }

    if (!authId) {
      return {
        user: existingByEmail,
        matchedBy: UserAuthenticationLinkMatch.EMAIL,
        outcome: UserAuthenticationLinkOutcome.NO_AUTH_PROVIDED,
      };
    }

    if (
      existingByEmail.authenticationID &&
      existingByEmail.authenticationID !== authId
    ) {
      // Check if the existing authenticationID is still valid in Kratos
      const existingKratosIdentity = await this.kratosService.getIdentityById(
        existingByEmail.authenticationID
      );

      if (existingKratosIdentity) {
        // Old identity still exists - this is a real conflict
        this.logger.error?.(
          'Authentication ID mismatch: user already linked to different identity',
          new Error().stack,
          LogContext.AUTH
        );
        if (conflictMode === 'error') {
          throw new UserAlreadyRegisteredException(
            'User already registered with different authentication ID',
            LogContext.AUTH,
            { email, existingAuthId: existingByEmail.authenticationID, incomingAuthId: authId }
          );
        }
        return {
          user: existingByEmail,
          matchedBy: UserAuthenticationLinkMatch.EMAIL,
          outcome: UserAuthenticationLinkOutcome.CONFLICT,
        };
      }

      // Old identity no longer exists in Kratos - allow relinking
      this.logger.verbose?.(
        `Old authentication ID ${existingByEmail.authenticationID} no longer exists in Kratos, allowing relink to ${authId}`,
        LogContext.AUTH
      );
    }

    const availability = await this.checkAuthenticationIdAvailability(
      authId,
      existingByEmail.id,
      conflictMode
    );

    if (!availability) {
      return {
        user: existingByEmail,
        matchedBy: UserAuthenticationLinkMatch.EMAIL,
        outcome: UserAuthenticationLinkOutcome.CONFLICT,
      };
    }

    if (existingByEmail.authenticationID === authId) {
      return {
        user: existingByEmail,
        matchedBy: UserAuthenticationLinkMatch.EMAIL,
        outcome: UserAuthenticationLinkOutcome.ALREADY_LINKED,
      };
    }

    existingByEmail.authenticationID = authId;
    const updatedUser = await this.userRepository.save(existingByEmail as User);
    this.logger.log?.(
      `Linked authentication ID ${authId} to user ${updatedUser.id}`,
      LogContext.AUTH
    );

    return {
      user: updatedUser,
      matchedBy: UserAuthenticationLinkMatch.EMAIL,
      outcome: UserAuthenticationLinkOutcome.LINKED,
    };
  }

  private async checkAuthenticationIdAvailability(
    authenticationId: string,
    currentUserId: string | undefined,
    conflictMode: UserAuthenticationLinkConflictMode
  ): Promise<boolean> {
    if (!authenticationId) {
      return true;
    }

    const existingUser =
      await this.userLookupService.getUserByAuthenticationID(authenticationId);

    if (existingUser && existingUser.id !== currentUserId) {
      this.logger.error?.(
        'Authentication ID already linked to another user',
        new Error().stack,
        LogContext.AUTH
      );
      if (conflictMode === 'error') {
        throw new UserAlreadyRegisteredException(
          'Kratos identity already linked to another user',
          LogContext.AUTH,
          { existingUserId: existingUser.id, authenticationId }
        );
      }
      return false;
    }

    return true;
  }
}
