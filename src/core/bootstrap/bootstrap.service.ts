import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { SpaceService } from '@domain/space/space/space.service';
import { UserService } from '@domain/community/user/user.service';
import { Repository } from 'typeorm';
import fs from 'fs';
import * as defaultRoles from '@templates/authorization-bootstrap.json';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Profiling } from '@common/decorators';
import { LogContext } from '@common/enums';
import { BootstrapException } from '@common/exceptions/bootstrap.exception';
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';
import {
  DEFAULT_HOST_ORG_DISPLAY_NAME,
  DEFAULT_HOST_ORG_NAMEID,
  DEFAULT_SPACE_DISPLAYNAME,
  DEFAULT_SPACE_NAMEID,
} from '@common/constants';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { OrganizationAuthorizationService } from '@domain/community/organization/organization.service.authorization';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AdminAuthorizationService } from '@platform/admin/authorization/admin.authorization.service';
import { PlatformService } from '@platform/platfrom/platform.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { PlatformAuthorizationService } from '@platform/platfrom/platform.service.authorization';
import { NameReporterService } from '@services/external/elasticsearch/name-reporter/name.reporter.service';
import { AccountService } from '@domain/space/account/account.service';
import { AccountAuthorizationService } from '@domain/space/account/account.service.authorization';
import { Account } from '@domain/space/account/account.entity';
import { SpaceType } from '@common/enums/space.type';
import { SearchIngestService } from '@services/api/search/v2/ingest/search.ingest.service';
import { CreateAccountInput } from '@domain/space/account/dto/account.dto.create';
import { SpaceLevel } from '@common/enums/space.level';
import { CreateSpaceOnAccountInput } from '@domain/space/account/dto/account.dto.create.space';
import { AlkemioConfig } from '@src/types';
import { AiServerService } from '@services/ai-server/ai-server/ai.server.service';
import { AiServerAuthorizationService } from '@services/ai-server/ai-server/ai.server.service.authorization';

@Injectable()
export class BootstrapService {
  constructor(
    private accountService: AccountService,
    private agentService: AgentService,
    private spaceService: SpaceService,
    private userService: UserService,
    private userAuthorizationService: UserAuthorizationService,
    private accountAuthorizationService: AccountAuthorizationService,
    private adminAuthorizationService: AdminAuthorizationService,
    private configService: ConfigService<AlkemioConfig, true>,
    private organizationService: OrganizationService,
    private platformService: PlatformService,
    private organizationAuthorizationService: OrganizationAuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private nameReporter: NameReporterService,
    private aiServer: AiServerService,
    private aiServerAuthorizationService: AiServerAuthorizationService,
    // todo remove later
    private ingestService: SearchIngestService
  ) {}

  async bootstrap() {
    // this.ingestService.ingest(); // todo remove later
    try {
      this.logger.verbose?.('Bootstrapping...', LogContext.BOOTSTRAP);

      Profiling.logger = this.logger;
      const profilingEnabled = this.configService.get(
        'monitoring.logging.profiling_enabled',
        { infer: true }
      );
      if (profilingEnabled) {
        Profiling.profilingEnabled = profilingEnabled;
      }

      await this.ensureAccountSpaceSingleton();
      await this.bootstrapProfiles();
      await this.ensureSsiPopulated();
      await this.platformService.ensureForumCreated();
      // reset auth as last in the actions
      await this.ensureAuthorizationsPopulated();
      // await this.ensureSpaceNamesInElastic();
    } catch (error: any) {
      this.logger.error(
        `Unable to complete bootstrap process: ${error}`,
        error?.stack,
        LogContext.BOOTSTRAP
      );
      throw new BootstrapException(error.message);
    }
  }

  async bootstrapProfiles() {
    const bootstrapAuthorizationEnabled = this.configService.get(
      'bootstrap.authorization.enabled',
      { infer: true }
    );
    if (!bootstrapAuthorizationEnabled) {
      this.logger.verbose?.(
        `Authorization Profile Loading: ${bootstrapAuthorizationEnabled}`,
        LogContext.BOOTSTRAP
      );
      return;
    }

    const bootstrapFilePath = this.configService.get(
      'bootstrap.authorization.file',
      { infer: true }
    );

    let bootstrapJson = {
      ...defaultRoles,
    };

    if (
      bootstrapFilePath &&
      fs.existsSync(bootstrapFilePath) &&
      fs.statSync(bootstrapFilePath).isFile()
    ) {
      this.logger.verbose?.(
        `Authorization bootstrap: configuration being loaded from '${bootstrapFilePath}'`,
        LogContext.BOOTSTRAP
      );
      const bootstratDataStr = fs.readFileSync(bootstrapFilePath).toString();
      this.logger.verbose?.(bootstratDataStr);
      if (!bootstratDataStr) {
        throw new BootstrapException(
          'Specified authorization bootstrap file not found!'
        );
      }
      bootstrapJson = JSON.parse(bootstratDataStr);
    } else {
      this.logger.verbose?.(
        'Authorization bootstrap: default configuration being loaded',
        LogContext.BOOTSTRAP
      );
    }

    const users = bootstrapJson.users;
    if (!users) {
      this.logger.verbose?.(
        'No users section in the authorization bootstrap file!',
        LogContext.BOOTSTRAP
      );
    } else {
      await this.createUserProfiles(users);
    }
  }

  @Profiling.api
  async createUserProfiles(usersData: any[]) {
    try {
      for (const userData of usersData) {
        const userExists = await this.userService.isRegisteredUser(
          userData.email
        );
        if (!userExists) {
          let user = await this.userService.createUser({
            email: userData.email,
            accountUpn: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileData: {
              displayName: `${userData.firstName} ${userData.lastName}`,
            },
          });
          const credentialsData = userData.credentials;
          for (const credentialData of credentialsData) {
            await this.adminAuthorizationService.grantCredentialToUser({
              userID: user.id,
              type: credentialData.type,
              resourceID: credentialData.resourceID,
            });
          }
          user = await this.userAuthorizationService.grantCredentials(user);
          const authorizations =
            await this.userAuthorizationService.applyAuthorizationPolicy(user);
          await this.authorizationPolicyService.saveAll(authorizations);
        }
      }
    } catch (error: any) {
      throw new BootstrapException(
        `Unable to create profiles ${error.message}`
      );
    }
  }

  // TODO: NOT USED?????
  private async ensureSpaceNamesInElastic() {
    const spaces = await this.spaceService.getAllSpaces({
      relations: {
        profile: {
          location: true,
        },
      },
    });

    const data = spaces.map(({ id, profile: { displayName: name } }) => ({
      id,
      name,
    }));

    this.nameReporter.bulkUpdateOrCreateNames(data);
  }

  async ensureSsiPopulated() {
    const ssiEnabled = this.configService.get('ssi.enabled', { infer: true });
    if (ssiEnabled) {
      await this.agentService.ensureDidsCreated();
    }
  }

  async ensureAuthorizationsPopulated() {
    // For platform
    const platform = await this.platformService.getPlatformOrFail();
    const platformAuthorization =
      this.authorizationPolicyService.validateAuthorization(
        platform.authorization
      );
    const platformCredentialRules =
      this.authorizationPolicyService.getCredentialRules(platformAuthorization);
    // Assume that zero rules means that the policy has not been reset
    if (platformCredentialRules.length == 0) {
      this.logger.verbose?.(
        '=== Identified that platform authorization had not been reset; resetting now ===',
        LogContext.BOOTSTRAP
      );
      const updatedAuthorizations =
        await this.platformAuthorizationService.applyAuthorizationPolicy();
      await this.authorizationPolicyService.saveAll(updatedAuthorizations);
    }

    // Also do same for AI Server until it is moved out of the server
    const aiServer = await this.aiServer.getAiServerOrFail();
    const aiServerAuthorization =
      this.authorizationPolicyService.validateAuthorization(
        aiServer.authorization
      );
    const aiServerCredentialRules =
      this.authorizationPolicyService.getCredentialRules(aiServerAuthorization);
    // Assume that zero rules means that the policy has not been reset
    if (aiServerCredentialRules.length == 0) {
      this.logger.verbose?.(
        '=== Identified that platform authorization had not been reset; resetting now ===',
        LogContext.BOOTSTRAP
      );
      const authorizations =
        await this.aiServerAuthorizationService.applyAuthorizationPolicy();
      await this.authorizationPolicyService.saveAll(authorizations);
    }
  }

  async ensureAccountSpaceSingleton() {
    this.logger.verbose?.(
      '=== Ensuring at least one Account with a space is present ===',
      LogContext.BOOTSTRAP
    );
    const accountCount = await this.accountRepository.count();
    if (accountCount == 0) {
      this.logger.verbose?.('...No account present...', LogContext.BOOTSTRAP);
      this.logger.verbose?.('........creating...', LogContext.BOOTSTRAP);
      // create a default host org
      let hostOrganization = await this.organizationService.getOrganization(
        DEFAULT_HOST_ORG_NAMEID
      );
      if (!hostOrganization) {
        hostOrganization = await this.organizationService.createOrganization({
          nameID: DEFAULT_HOST_ORG_NAMEID,
          profileData: {
            displayName: DEFAULT_HOST_ORG_DISPLAY_NAME,
          },
        });
        const authorizations =
          await this.organizationAuthorizationService.applyAuthorizationPolicy(
            hostOrganization
          );
        await this.authorizationPolicyService.saveAll(authorizations);
      }

      const spaceInput: CreateAccountInput = {
        spaceData: {
          nameID: DEFAULT_SPACE_NAMEID,
          profileData: {
            displayName: DEFAULT_SPACE_DISPLAYNAME,
            tagline: 'An empty space to be populated',
          },
          level: SpaceLevel.SPACE,
          type: SpaceType.SPACE,
        },
        hostID: hostOrganization.id,
      };

      let account = await this.accountService.createAccount(spaceInput);
      const createSpaceAccountInput: CreateSpaceOnAccountInput = {
        accountID: account.id,
        spaceData: spaceInput.spaceData,
      };
      account = await this.accountService.createSpaceOnAccount(
        account,
        createSpaceAccountInput
      );
      account = await this.accountService.save(account);
      const authorizations =
        await this.accountAuthorizationService.applyAuthorizationPolicy(
          account
        );
      await this.authorizationPolicyService.saveAll(authorizations);
      return account;
    }
  }
}
