import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { AgentInfo } from './agent.info';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { IVerifiedCredential } from '@domain/agent/verified-credential/verified.credential.interface';
import { AgentInfoMetadata } from './agent.info.metadata';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { User } from '@domain/community/user/user.entity';
import { ICredential } from '@domain/agent/credential/credential.interface';
import { UserAuthenticationLinkService } from '@domain/community/user-authentication-link/user.authentication.link.service';

@Injectable()
export class AgentInfoService {
  constructor(
    private readonly userAuthenticationLinkService: UserAuthenticationLinkService,
    @InjectEntityManager('default')
    private readonly entityManager: EntityManager,
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

  /**
   * Retrieves the agent information metadata for a given email.
   *
   * @param email - The email address of the user whose agent information metadata is to be retrieved.
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

    try {
      const resolved =
        await this.userAuthenticationLinkService.resolveExistingUser(
          agentInfo,
          {
            relations: {
              agent: {
                credentials: true,
              },
            },
            conflictMode: 'log',
          }
        );

      if (!resolved) {
        throw new EntityNotFoundException(
          `Unable to load User, Agent or Credentials for User: ${email}`,
          LogContext.COMMUNITY
        );
      }

      const user = resolved.user;
      if (!user || !user.agent || !user.agent.credentials) {
        throw new EntityNotFoundException(
          `Unable to load User, Agent or Credentials for User: ${email}`,
          LogContext.COMMUNITY
        );
      }

      const userAgentInfoMetadata = new AgentInfoMetadata();
      userAgentInfoMetadata.credentials = user.agent.credentials;
      userAgentInfoMetadata.agentID = user.agent.id;
      userAgentInfoMetadata.userID = user.id;
      userAgentInfoMetadata.communicationID = user.communicationID;
      userAgentInfoMetadata.authenticationID =
        user.authenticationID ?? undefined;
      return userAgentInfoMetadata;
    } catch (error) {
      this.logger.verbose?.(
        `User not registered: ${email}, ${error}`,
        LogContext.AUTH
      );
      return undefined;
    }
  }

  /**
   * Populates the given `agentInfo` object with metadata from `agentInfoMetadata`.
   *
   * @param agentInfo - The agent information object to be populated.
   * @param agentInfoMetadata - The metadata containing information to populate the agent info.
   *
   * @remarks
   * This method assigns the `agentID`, `userID`, and `communicationID` from `agentInfoMetadata` to `agentInfo`.
   * If `agentInfoMetadata` contains credentials, they are also assigned to `agentInfo`.
   * If credentials are not available, a warning is logged.
   */
  public populateAgentInfoWithMetadata(
    agentInfo: AgentInfo,
    agentInfoMetadata: AgentInfoMetadata
  ): void {
    agentInfo.agentID = agentInfoMetadata.agentID;
    agentInfo.userID = agentInfoMetadata.userID;
    agentInfo.communicationID = agentInfoMetadata.communicationID;
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

    const user = await this.entityManager.findOneOrFail(User, {
      where: { id: userId },
      relations: {
        agent: {
          credentials: true,
        },
      },
    });

    if (!user.agent || !user.agent.credentials) {
      throw new EntityNotInitializedException(
        `Agent not loaded for User: ${user.id}`,
        LogContext.WHITEBOARD_INTEGRATION,
        { userId }
      );
    }

    // const verifiedCredentials =
    //   await this.agentService.getVerifiedCredentials(user.agent);
    const verifiedCredentials = [] as IVerifiedCredential[];
    // construct the agent info object needed for isAccessGranted
    let credentials: ICredentialDefinition[] = [];

    if (user.agent.credentials.length !== 0) {
      credentials = user.agent.credentials.map(
        (credential: ICredential): ICredentialDefinition => {
          return {
            type: credential.type,
            resourceID: credential.resourceID,
          };
        }
      );
    }

    const agentInfo = new AgentInfo();
    agentInfo.credentials = credentials;
    agentInfo.verifiedCredentials = verifiedCredentials;
    if (user.authenticationID) {
      agentInfo.authenticationID = user.authenticationID;
    }
    return agentInfo;
  }
}
