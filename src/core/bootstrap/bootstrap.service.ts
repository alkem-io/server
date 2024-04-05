import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { SpaceService } from '@domain/challenge/space/space.service';
import { UserService } from '@domain/community/user/user.service';
import { Repository } from 'typeorm';
import fs from 'fs';
import * as defaultRoles from '@templates/authorization-bootstrap.json';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Profiling } from '@common/decorators';
import { ConfigurationTypes, LogContext } from '@common/enums';
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
import { AccountService } from '@domain/challenge/account/account.service';
import { AccountAuthorizationService } from '@domain/challenge/account/account.service.authorization';
import { Account } from '@domain/challenge/account/account.entity';
import { SpaceType } from '@common/enums/space.type';
import { SearchIngestService } from '@services/api/search2/search.ingest/search.ingest.service';
import { CreateAccountInput } from '@domain/challenge/account/dto/account.dto.create';

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
    private configService: ConfigService,
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
    // todo remove later
    private ingestService: SearchIngestService
  ) {}

  async bootstrap() {
    // this.ingestService.ingest(); // todo remove later
    try {
      this.logger.verbose?.('Bootstrapping...', LogContext.BOOTSTRAP);
      this.logConfiguration();

      Profiling.logger = this.logger;
      const profilingEnabled = this.configService.get(
        ConfigurationTypes.MONITORING
      )?.logging?.profiling_enabled;
      if (profilingEnabled) Profiling.profilingEnabled = profilingEnabled;

      await this.ensureSpaceSingleton();
      await this.bootstrapProfiles();
      await this.ensureSsiPopulated();
      await this.platformService.ensureCommunicationCreated();
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

  logConfiguration() {
    this.logger.verbose?.(
      '==== Configuration - Start ===',
      LogContext.BOOTSTRAP
    );

    const values = Object.values(ConfigurationTypes);
    for (const value of values) {
      this.logConfigLevel(value, this.configService.get(value));
    }
    this.logger.verbose?.('==== Configuration - End ===', LogContext.BOOTSTRAP);
  }

  logConfigLevel(key: any, value: any, indent = '', incrementalIndent = '  ') {
    if (typeof value === 'object') {
      const msg = `${indent}${key}:`;
      this.logger.verbose?.(`${msg}`, LogContext.BOOTSTRAP);
      Object.keys(value).forEach(childKey => {
        const childValue = value[childKey];
        const newIndent = `${indent}${incrementalIndent}`;
        this.logConfigLevel(childKey, childValue, newIndent, incrementalIndent);
      });
    } else {
      const msg = `${indent}==> ${key}: ${value}`;
      this.logger.verbose?.(`${msg}`, LogContext.BOOTSTRAP);
    }
  }

  async bootstrapProfiles() {
    const bootstrapAuthorizationEnabled = this.configService.get(
      ConfigurationTypes.BOOTSTRAP
    )?.authorization?.enabled;
    if (!bootstrapAuthorizationEnabled) {
      this.logger.verbose?.(
        `Authorization Profile Loading: ${bootstrapAuthorizationEnabled}`,
        LogContext.BOOTSTRAP
      );
      return;
    }

    const bootstrapFilePath = this.configService.get(
      ConfigurationTypes.BOOTSTRAP
    )?.authorization?.file as string;

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
          const nameID = this.userService.createUserNameID(
            userData.firstName,
            userData.lastName,
            false
          );
          let user = await this.userService.createUser({
            nameID: nameID,
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
          user = await this.userAuthorizationService.applyAuthorizationPolicy(
            user
          );
        }
      }
    } catch (error: any) {
      throw new BootstrapException(
        `Unable to create profiles ${error.message}`
      );
    }
  }

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
    const ssiEnabled = this.configService.get(ConfigurationTypes.SSI).enabled;
    if (ssiEnabled) {
      await this.agentService.ensureDidsCreated();
    }
  }

  async ensureAuthorizationsPopulated() {
    const platform = await this.platformService.getPlatformOrFail();
    const authorization = this.authorizationPolicyService.validateAuthorization(
      platform.authorization
    );
    const credentialRules =
      this.authorizationPolicyService.getCredentialRules(authorization);
    // Assume that zero rules means that the policy has not been reset
    if (credentialRules.length == 0) {
      this.logger.verbose?.(
        '=== Identified that platform authorization had not been reset; resetting now ===',
        LogContext.BOOTSTRAP
      );
      await this.platformAuthorizationService.applyAuthorizationPolicy();
    }
  }

  async ensureSpaceSingleton() {
    this.logger.verbose?.(
      '=== Ensuring at least one Account with a space is present ===',
      LogContext.BOOTSTRAP
    );
    const accountCount = await this.accountRepository.count();
    if (accountCount == 0) {
      this.logger.verbose?.('...No account present...', LogContext.BOOTSTRAP);
      this.logger.verbose?.('........creating...', LogContext.BOOTSTRAP);
      // create a default host org
      const hostOrganization = await this.organizationService.getOrganization(
        DEFAULT_HOST_ORG_NAMEID
      );
      if (!hostOrganization) {
        const hostOrg = await this.organizationService.createOrganization({
          nameID: DEFAULT_HOST_ORG_NAMEID,
          profileData: {
            displayName: DEFAULT_HOST_ORG_DISPLAY_NAME,
          },
        });
        await this.organizationAuthorizationService.applyAuthorizationPolicy(
          hostOrg
        );
      }

      const spaceInput: CreateAccountInput = {
        spaceData: {
          nameID: DEFAULT_SPACE_NAMEID,
          profileData: {
            displayName: DEFAULT_SPACE_DISPLAYNAME,
            tagline: 'An empty space to be populated',
          },
          level: 0,
          type: SpaceType.SPACE,
        },
        hostID: DEFAULT_HOST_ORG_NAMEID,
      };
      const account = await this.accountService.createAccount(spaceInput);
      return await this.accountAuthorizationService.applyAuthorizationPolicy(
        account
      );
    }
  }
}
