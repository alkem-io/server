import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOneOptions } from 'typeorm';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { User } from '@domain/community/user/user.entity';
import { IUser } from '@domain/community/user/user.interface';
import { LogContext } from '@common/enums';
import { UserAlreadyRegisteredException } from '@common/exceptions';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

type ConflictMode = 'error' | 'log';

type ResolveOptions = {
  relations?: FindOneOptions<User>['relations'];
  conflictMode?: ConflictMode;
  lookupByAuthenticationId?: boolean;
};

export enum UserAuthenticationLinkMatch {
  AUTHENTICATION_ID = 'authentication-id',
  EMAIL = 'email',
}

export enum UserAuthenticationLinkOutcome {
  ALREADY_LINKED = 'already-linked',
  LINKED = 'linked',
  NO_AUTH_PROVIDED = 'no-auth-provided',
  CONFLICT = 'conflict',
}

export interface UserAuthenticationLinkResult {
  user: IUser;
  matchedBy: UserAuthenticationLinkMatch;
  outcome: UserAuthenticationLinkOutcome;
}

@Injectable()
export class UserAuthenticationLinkService {
  constructor(
    private readonly userLookupService: UserLookupService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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
    options?: ResolveOptions
  ): Promise<UserAuthenticationLinkResult | null> {
    const authId = agentInfo.authenticationID?.trim();
    const email = agentInfo.email?.trim().toLowerCase();
    const relations = options?.relations;
    const conflictMode: ConflictMode = options?.conflictMode ?? 'error';
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
      const message = `Authentication ID mismatch for user ${existingByEmail.id}: existing ${existingByEmail.authenticationID}, incoming ${authId}`;
      this.logger.error?.(message, LogContext.AUTH);
      if (conflictMode === 'error') {
        throw new UserAlreadyRegisteredException(
          `User with email: ${email} already registered`
        );
      }
      return {
        user: existingByEmail,
        matchedBy: UserAuthenticationLinkMatch.EMAIL,
        outcome: UserAuthenticationLinkOutcome.CONFLICT,
      };
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
    conflictMode: ConflictMode
  ): Promise<boolean> {
    if (!authenticationId) {
      return true;
    }

    const existingUser =
      await this.userLookupService.getUserByAuthenticationID(authenticationId);

    if (existingUser && existingUser.id !== currentUserId) {
      const message = `Authentication ID already linked to user ${existingUser.id}`;
      this.logger.error?.(message, LogContext.AUTH);
      if (conflictMode === 'error') {
        throw new UserAlreadyRegisteredException(
          'Kratos identity already linked to another user'
        );
      }
      return false;
    }

    return true;
  }
}
