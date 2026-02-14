import { AuthorizationCredential, LogContext } from '@common/enums';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { ICredential } from '@domain/agent/credential/credential.interface';
import { User } from '@domain/community/user/user.entity';
import { UserAuthenticationLinkService } from '@domain/community/user-authentication-link/user.authentication.link.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Identity, Session } from '@ory/kratos-client';
import { OryDefaultIdentitySchema } from '@services/infrastructure/kratos/types/ory.default.identity.schema';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { eq } from 'drizzle-orm';
import { users as userSchema } from '@domain/community/user/user.schema';
import { AgentInfo } from './agent.info';
import { AgentInfoMetadata } from './agent.info.metadata';

@Injectable()
export class AgentInfoService {
  constructor(
    private readonly userAuthenticationLinkService: UserAuthenticationLinkService,
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  // Note for now a very empty service, but later as we start allowing "acting as" agents this service will expand.
  // To consider: moving function related to AgentInfoMetaData from user service here, to remove dependency on UserModule in Authentication Module
  public createAnonymousAgentInfo(): AgentInfo {
    const emptyAgentInfo = new AgentInfo();
    const anonymousCredential: ICredentialDefinition = {
      type: AuthorizationCredential.GLOBAL_ANONYMOUS,
      resourceID: '',
    };
    emptyAgentInfo.credentials = [anonymousCredential];
    emptyAgentInfo.isAnonymous = true;
    return emptyAgentInfo;
  }

  public createGuestAgentInfo(guestName: string): AgentInfo {
    const guestAgentInfo = new AgentInfo();
    const guestCredential: ICredentialDefinition = {
      type: AuthorizationCredential.GLOBAL_GUEST,
      resourceID: '',
    };
    guestAgentInfo.credentials = [guestCredential];
    guestAgentInfo.firstName = guestName;
    guestAgentInfo.isAnonymous = false; // Guest has a name, so not truly anonymous
    guestAgentInfo.guestName = guestName; // Store the guest name
    return guestAgentInfo;
  }

  /**
   * Retrieves the agent information metadata for a given email.
   *
   * @param email - The email address of the user whose agent information metadata is to be retrieved.
   * @param options - Optional parameters.
   * @returns A promise that resolves to the agent information metadata if found, or undefined if the user is not registered.
   * @throws Will log an error message if the user is not registered.
   */
  public async getAgentInfoMetadata(
    email: string,
    options?: { authenticationId?: string }
  ): Promise<AgentInfoMetadata | undefined> {
    const agentInfo = new AgentInfo();
    agentInfo.email = email;
    if (options?.authenticationId) {
      agentInfo.authenticationID = options.authenticationId;
    }

    const resolved =
      await this.userAuthenticationLinkService.resolveExistingUser(agentInfo, {
        with: {
          agent: {
            credentials: true,
          },
        },
        conflictMode: 'log',
      });

    const user = resolved?.user;
    const agent = user?.agent;
    const credentials = agent?.credentials;

    if (!user || !agent || !credentials) {
      this.logger.verbose?.(`User not registered: ${email}`, LogContext.AUTH);
      return undefined;
    }

    const userAgentInfoMetadata = new AgentInfoMetadata();
    userAgentInfoMetadata.credentials = credentials;
    userAgentInfoMetadata.agentID = agent.id;
    userAgentInfoMetadata.userID = user.id;
    userAgentInfoMetadata.authenticationID = user.authenticationID ?? undefined;
    return userAgentInfoMetadata;
  }

  /**
   * Populates the given `agentInfo` object with metadata from `agentInfoMetadata`.
   *
   * @param agentInfo - The agent information object to be populated.
   * @param agentInfoMetadata - The metadata containing information to populate the agent info.
   *
   * @remarks
   * This method assigns the `agentID` and `userID` from `agentInfoMetadata` to `agentInfo`.
   * If `agentInfoMetadata` contains credentials, they are also assigned to `agentInfo`.
   * If credentials are not available, a warning is logged.
   */
  public populateAgentInfoWithMetadata(
    agentInfo: AgentInfo,
    agentInfoMetadata: AgentInfoMetadata
  ): void {
    agentInfo.agentID = agentInfoMetadata.agentID;
    agentInfo.userID = agentInfoMetadata.userID;
    if (agentInfoMetadata.authenticationID) {
      agentInfo.authenticationID = agentInfoMetadata.authenticationID;
    }

    if (agentInfoMetadata.credentials) {
      agentInfo.credentials = agentInfoMetadata.credentials;
    } else {
      this.logger.warn?.(
        `Authentication Info: Unable to retrieve credentials for registered user: ${agentInfo.email}`,
        LogContext.AUTH
      );
    }
  }

  public async buildAgentInfoForUser(userId: string): Promise<AgentInfo> {
    if (!userId) {
      return this.createAnonymousAgentInfo();
    }

    const user = await this.db.query.users.findFirst({
      where: eq(userSchema.id, userId),
      with: {
        agent: {
          with: {
            credentials: true,
          },
        },
      },
    });

    if (!user || !user.agent || !user.agent.credentials) {
      throw new EntityNotInitializedException(
        `Agent not loaded for User: ${userId}`,
        LogContext.WHITEBOARD_INTEGRATION,
        { userId }
      );
    }

    // construct the agent info object needed for isAccessGranted
    let credentials: ICredentialDefinition[] = [];

    if (user.agent.credentials.length !== 0) {
      credentials = user.agent.credentials.map(
        (credential): ICredentialDefinition => {
          return {
            type: credential.type as AuthorizationCredential,
            resourceID: credential.resourceID,
          };
        }
      );
    }

    const agentInfo = new AgentInfo();
    agentInfo.credentials = credentials;
    return agentInfo;
  }

  /**
   * Builds an AgentInfo from an Ory Identity schema.
   * Consolidates logic previously duplicated in AuthenticationService and IdentityResolveService.
   *
   * @param identity - The Ory Identity (can be typed OryDefaultIdentitySchema or generic Identity)
   * @param options - Optional configuration
   * @param options.session - Ory session for expiry information
   * @param options.authenticationId - Override authentication ID (defaults to identity.id)
   * @returns AgentInfo populated with identity data
   */
  public buildAgentInfoFromOryIdentity(
    identity: OryDefaultIdentitySchema | Identity,
    options?: {
      session?: Session;
      authenticationId?: string;
    }
  ): AgentInfo {
    const agentInfo = new AgentInfo();
    const oryIdentity = identity as OryDefaultIdentitySchema;
    const traits = (oryIdentity.traits ?? {}) as Record<string, any>;

    // Extract email - try traits.email first, then verifiable_addresses
    const email =
      (traits.email as string | undefined) ??
      oryIdentity.verifiable_addresses?.[0]?.value ??
      '';

    // Determine email verification status
    const isEmailVerified = Array.isArray(oryIdentity.verifiable_addresses)
      ? oryIdentity.verifiable_addresses.some(
          addr => addr.via === 'email' && addr.verified
        )
      : false;

    agentInfo.email = email.toLowerCase();
    agentInfo.emailVerified = isEmailVerified;
    agentInfo.firstName = (traits?.name?.first as string) ?? '';
    agentInfo.lastName = (traits?.name?.last as string) ?? '';
    agentInfo.avatarURL = (traits?.picture as string) ?? '';
    agentInfo.authenticationID = options?.authenticationId ?? identity.id;

    // Set session expiry if provided
    if (options?.session?.expires_at) {
      agentInfo.expiry = new Date(options.session.expires_at).getTime();
    }

    return agentInfo;
  }

  /**
   * Builds an AgentInfo from an agent ID.
   * Consolidates logic previously in MessageInboxService.
   *
   * @param agentId - The agent's UUID
   * @param options - Optional configuration
   * @param options.includeCredentials - Whether to load and include credentials (default: false)
   * @returns AgentInfo populated with user data, or anonymous AgentInfo if agent is not a user
   */
  public async buildAgentInfoForAgent(
    agentId: string,
    options?: { includeCredentials?: boolean }
  ): Promise<AgentInfo> {
    // Try to find user by agent ID
    const user = await this.db.query.users.findFirst({
      where: eq(userSchema.agentId, agentId),
      with: options?.includeCredentials
        ? { agent: { with: { credentials: true } } }
        : { agent: true },
    });

    if (user?.agent) {
      const agentInfo = new AgentInfo();
      agentInfo.userID = user.id;
      agentInfo.agentID = agentId;
      agentInfo.email = user.email;
      agentInfo.firstName = user.firstName;
      agentInfo.lastName = user.lastName;
      agentInfo.isAnonymous = false;
      agentInfo.authenticationID = user.authenticationID || '';

      if (options?.includeCredentials && user.agent.credentials) {
        agentInfo.credentials = user.agent.credentials.map(
          (credential): ICredentialDefinition => ({
            type: credential.type as AuthorizationCredential,
            resourceID: credential.resourceID,
          })
        );
      } else {
        agentInfo.credentials = [];
      }

      return agentInfo;
    }

    // Agent is not a user (likely a VC or system), return anonymous
    const agentInfo = new AgentInfo();
    agentInfo.agentID = agentId;
    agentInfo.isAnonymous = true;
    agentInfo.credentials = [];
    return agentInfo;
  }
}
