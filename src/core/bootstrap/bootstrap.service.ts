import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Ecoverse } from '@domain/challenge/ecoverse/ecoverse.entity';
import { EcoverseService } from '@domain/challenge/ecoverse/ecoverse.service';
import { UserService } from '@domain/community/user/user.service';
import { Repository } from 'typeorm';
import fs from 'fs';
import * as defaultRoles from '@templates/authorization-bootstrap.json';
import * as preferenceDefinition from '@templates/user-preference-definition.json';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Profiling } from '@common/decorators';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { BootstrapException } from '@common/exceptions/bootstrap.exception';
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';
import { EcoverseAuthorizationService } from '@domain/challenge/ecoverse/ecoverse.service.authorization';
import {
  DEFAULT_ECOVERSE_DISPLAYNAME,
  DEFAULT_ECOVERSE_NAMEID,
  DEFAULT_HOST_ORG_DISPLAY_NAME,
  DEFAULT_HOST_ORG_NAMEID,
} from '@common/constants';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { OrganizationAuthorizationService } from '@domain/community/organization/organization.service.authorization';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AdminAuthorizationService } from '@services/admin/authorization/admin.authorization.service';
import { UserPreferenceService } from '@domain/community/user-preferences';
import { CreateUserPreferenceDefinitionInput } from '@domain/community/user-preferences/dto';

@Injectable()
export class BootstrapService {
  constructor(
    private agentService: AgentService,
    private ecoverseService: EcoverseService,
    private preferenceService: UserPreferenceService,
    private userService: UserService,
    private userAuthorizationService: UserAuthorizationService,
    private ecoverseAuthorizationService: EcoverseAuthorizationService,
    private adminAuthorizationService: AdminAuthorizationService,
    private configService: ConfigService,
    private organizationService: OrganizationService,
    private organizationAuthorizationService: OrganizationAuthorizationService,
    @InjectRepository(Ecoverse)
    private ecoverseRepository: Repository<Ecoverse>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async bootstrapEcoverse() {
    try {
      this.logger.verbose?.('Bootstrapping Ecoverse...', LogContext.BOOTSTRAP);
      this.logConfiguration();

      Profiling.logger = this.logger;
      const profilingEnabled = this.configService.get(
        ConfigurationTypes.MONITORING
      )?.logging?.profiling_enabled;
      if (profilingEnabled) Profiling.profilingEnabled = profilingEnabled;

      await this.ensureEcoverseSingleton();
      await this.bootstrapProfiles();
      await this.ensureSsiPopulated();
    } catch (error: any) {
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
      ...preferenceDefinition,
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

    const preferenceDef =
      bootstrapJson.userPreferenceDefinition as CreateUserPreferenceDefinitionInput[];
    if (!preferenceDef) {
      this.logger.verbose?.(
        'No users section in the authorization bootstrap file!',
        LogContext.BOOTSTRAP
      );
    } else {
      // todo create preference definitions
      await this.createUserPreferenceDefinitions(preferenceDef);
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
            displayName: `${userData.firstName} ${userData.lastName}`,
            accountUpn: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
          });
          const credentialsData = userData.credentials;
          for (const credentialData of credentialsData) {
            await this.adminAuthorizationService.grantCredential({
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

  @Profiling.api
  async createUserPreferenceDefinitions(
    definitionData: CreateUserPreferenceDefinitionInput[]
  ) {
    try {
      definitionData.forEach(
        async ({ group, displayName, description, valueType, type }) => {
          const exists = await this.preferenceService.definitionExists(
            group,
            valueType,
            type
          );
          if (!exists) {
            await this.preferenceService.createDefinition({
              group,
              displayName,
              description,
              valueType,
              type,
            });
          }
        }
      );
    } catch (err: unknown) {
      throw new BootstrapException(
        `Unable to create profiles ${(err as Error).message}`
      );
    }
  }

  async ensureSsiPopulated() {
    const ssiEnabled = this.configService.get(ConfigurationTypes.IDENTITY).ssi
      .enabled;
    if (ssiEnabled) {
      await this.agentService.ensureDidsCreated();
    }
  }

  async ensureEcoverseSingleton() {
    this.logger.verbose?.(
      '=== Ensuring at least one ecoverse is present ===',
      LogContext.BOOTSTRAP
    );
    const ecoverseCount = await this.ecoverseRepository.count();
    if (ecoverseCount == 0) {
      this.logger.verbose?.('...No ecoverse present...', LogContext.BOOTSTRAP);
      this.logger.verbose?.('........creating...', LogContext.BOOTSTRAP);
      // create a default host org
      const hostOrganization = await this.organizationService.getOrganization(
        DEFAULT_HOST_ORG_NAMEID
      );
      if (!hostOrganization) {
        const hostOrg = await this.organizationService.createOrganization({
          nameID: DEFAULT_HOST_ORG_NAMEID,
          displayName: DEFAULT_HOST_ORG_DISPLAY_NAME,
        });
        await this.organizationAuthorizationService.applyAuthorizationPolicy(
          hostOrg
        );
      }

      const ecoverse = await this.ecoverseService.createEcoverse({
        nameID: DEFAULT_ECOVERSE_NAMEID,
        displayName: DEFAULT_ECOVERSE_DISPLAYNAME,
        hostID: DEFAULT_HOST_ORG_NAMEID,
        context: {
          tagline: 'An empty ecoverse to be populated',
        },
      });
      return await this.ecoverseAuthorizationService.applyAuthorizationPolicy(
        ecoverse
      );
    }
  }
}
