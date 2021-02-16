import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Ecoverse } from '@domain/ecoverse/ecoverse.entity';
import { IEcoverse } from '@domain/ecoverse/ecoverse.interface';
import { EcoverseService } from '@domain/ecoverse/ecoverse.service';
import { RestrictedGroupNames } from '@domain/user-group/user-group.entity';
import { UserInput } from '@domain/user/user.dto';
import { UserService } from '@domain/user/user.service';
import { IServiceConfig } from '@interfaces/service.config.interface';
import { Repository } from 'typeorm';
import fs from 'fs';
import * as defaultRoles from '@templates/authorisation-bootstrap.json';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Profiling } from '@utils/logging/logging.profiling.decorator';
import { LogContext } from '@utils/logging/logging.contexts';
import { ILoggingConfig } from '@interfaces/logging.config.interface';
import { EntityNotInitializedException } from '@utils/error-handling/exceptions/entity.not.initialized.exception';
import { ValidationException } from '@utils/error-handling/exceptions/validation.exception';
import { BaseException } from '@utils/error-handling/exceptions/base.exception';
import { EntityNotFoundException } from '@utils/error-handling/exceptions/entity.not.found.exception';
import { CherrytwistErrorStatus } from '@utils/error-handling/enums/cherrytwist.error.status';
import { UserFactoryService } from '@domain/user/user.factory.service';

@Injectable()
export class BootstrapService {
  constructor(
    private ecoverseService: EcoverseService,
    private userService: UserService,
    private userFactoryService: UserFactoryService,
    private configService: ConfigService,
    @InjectRepository(Ecoverse)
    private ecoverseRepository: Repository<Ecoverse>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async bootstrapEcoverse() {
    try {
      this.logger.verbose?.('Bootstrapping Ecoverse...', LogContext.BOOTSTRAP);
      this.logConfig();

      Profiling.logger = this.logger;
      const profilingEnabled = this.configService.get<ILoggingConfig>('logging')
        ?.profilingEnabled;
      if (profilingEnabled) Profiling.profilingEnabled = profilingEnabled;
      this.logger.verbose?.('Bootstrapping Ecoverse...', LogContext.BOOTSTRAP);

      // Now setup the rest...
      await this.ensureEcoverseSingleton();
      await this.bootstrapProfiles();
    } catch (error) {
      this.logger.error(error, undefined, LogContext.BOOTSTRAP);
    }
  }

  logConfig() {
    const configs = [
      'aad',
      'aad_client',
      'database',
      'logging',
      'ms-graph',
      'service',
    ];
    for (const configName of configs) {
      this.logger.verbose?.(`===== Configuration: ${configName}`);
      const config = this.configService.get<ILoggingConfig>(configName);
      if (!config)
        throw new BaseException(
          'Unable to obtain configuration: $${configName}',
          LogContext.BOOTSTRAP
        );
      const entries = Object.entries(config);
      for (const [key, value] of entries) {
        if (
          key === 'loggingNoPII' &&
          value === false &&
          process.env.AUTH_AAD_LOGGING_PII === 'false'
        )
          this.logger.warn(
            'Overriding AUTH_AAD_LOGGING_PII to true due to Microsoft passportJs bearer strategy bug https://github.com/AzureAD/passport-azure-ad/issues/521.',
            LogContext.BOOTSTRAP
          );
        this.logConfigLevel(key, value, '');
      }
    }
  }

  logConfigLevel(key: any, value: any, indent: string) {
    if (typeof value === 'object') {
      this.logger.verbose?.(`Variable: ${key}:`);
      Object.keys(value).forEach(childKey => {
        const childValue = value[childKey];
        const newIndent = `${indent}....`;
        this.logConfigLevel(childKey, childValue, newIndent);
      });
    } else {
      this.logger.verbose?.(
        `${indent}Variable: ${key}: ${value}`,
        LogContext.BOOTSTRAP
      );
    }
  }

  async bootstrapProfiles() {
    const bootstrapFilePath = this.configService.get<IServiceConfig>('service')
      ?.authorisationBootstrapPath as string;

    let bootstrapJson = {
      ...defaultRoles,
    };

    if (
      bootstrapFilePath &&
      fs.existsSync(bootstrapFilePath) &&
      fs.statSync(bootstrapFilePath).isFile()
    ) {
      this.logger.verbose?.(
        `Authorisation bootstrap: configuration being loaded from '${bootstrapFilePath}'`,
        LogContext.BOOTSTRAP
      );
      const bootstratDataStr = fs.readFileSync(bootstrapFilePath).toString();
      this.logger.verbose?.(bootstratDataStr);
      if (!bootstratDataStr) {
        this.logger.error(
          'Specified authorisation bootstrap file not found!',
          undefined,
          LogContext.BOOTSTRAP
        );
        return;
      }
      bootstrapJson = JSON.parse(bootstratDataStr);
    } else {
      this.logger.verbose?.(
        'Authorisation bootstrap: default configuration being loaded',
        LogContext.BOOTSTRAP
      );
    }

    const ecoverseAdmins = bootstrapJson.ecoverseAdmins;
    if (!ecoverseAdmins)
      this.logger.verbose?.(
        'No ecoverse admins section in the authorisation bootstrap file!',
        LogContext.BOOTSTRAP
      );
    else {
      await this.createGroupProfiles(
        RestrictedGroupNames.EcoverseAdmins,
        ecoverseAdmins
      );
    }
    const globalAdmins = bootstrapJson.globalAdmins;
    if (!globalAdmins) {
      this.logger.verbose?.(
        'No global admins section in the authorisation bootstrap file!',
        LogContext.BOOTSTRAP
      );
    } else {
      await this.createGroupProfiles(
        RestrictedGroupNames.GlobalAdmins,
        globalAdmins
      );
    }
    const communityAdmins = bootstrapJson.communityAdmins;
    if (!communityAdmins) {
      this.logger.verbose?.(
        'No community admins section in the authorisation bootstrap file!',
        LogContext.BOOTSTRAP
      );
    } else {
      await this.createGroupProfiles(
        RestrictedGroupNames.CommunityAdmins,
        communityAdmins
      );
    }
    const members = bootstrapJson.members;
    if (!members) {
      this.logger.verbose?.(
        'No coverse members section in the authorisation bootstrap file!',
        LogContext.BOOTSTRAP
      );
    } else {
      await this.createGroupProfiles(RestrictedGroupNames.Members, members);
    }
  }

  @Profiling.api
  async createGroupProfiles(groupName: string, usersData: any[]) {
    try {
      for (const userData of usersData) {
        const userInput = new UserInput();
        userInput.email = userData.email;
        // For bootstrap puroposes also set the upn to the same as the email
        userInput.accountUpn = userData.email;
        userInput.name = `${userData.firstName} ${userData.lastName}`;
        userInput.firstName = userData.firstName;
        userInput.lastName = userData.lastName;

        // Check the user exists
        let user = await this.userService.getUserByEmail(userInput.email);
        if (!user) {
          // First create, then ensure groups are loaded - not optimal but only on bootstrap
          user = await this.userFactoryService.createUser(userInput);
          if (groupName !== RestrictedGroupNames.Members) {
            // also need to add to members group
            await this.ecoverseService.addUserToRestrictedGroup(
              user,
              RestrictedGroupNames.Members
            );
          }
        }
        user = await this.userService.getUserWithGroups(userInput.email);

        if (!user)
          throw new EntityNotFoundException(
            'Unable to create group profiles.',
            LogContext.BOOTSTRAP,
            CherrytwistErrorStatus.USER_PROFILE_NOT_FOUND
          );

        const groups = user.userGroups;
        if (!groups)
          throw new EntityNotInitializedException(
            `User ${user.email} isn't initialised properly. The user doesn't belong to any groups!`,
            LogContext.BOOTSTRAP
          );

        if (!groups.some(({ name }) => groupName === name))
          await this.ecoverseService.addUserToRestrictedGroup(user, groupName);
        else
          this.logger.verbose?.(
            `User ${userInput.email} already exists in group ${groupName}`,
            LogContext.BOOTSTRAP
          );
      }
    } catch (error) {
      this.logger.error(
        `Unable to create profiles ${error.message}`,
        error,
        LogContext.BOOTSTRAP
      );
    }
  }

  async ensureEcoverseSingleton(): Promise<IEcoverse> {
    this.logger.verbose?.(
      '=== Ensuring single ecoverse is present ===',
      LogContext.BOOTSTRAP
    );
    const [
      ecoverseArray,
      ecoverseCount,
    ] = await this.ecoverseRepository.findAndCount();
    if (ecoverseCount == 0) {
      this.logger.verbose?.('...No ecoverse present...', LogContext.BOOTSTRAP);
      this.logger.verbose?.('........creating...', LogContext.BOOTSTRAP);
      // Create a new ecoverse
      const ecoverse = new Ecoverse();
      await this.ecoverseService.initialiseMembers(ecoverse);
      // Save is needed so that the ecoverse is there for other methods
      await this.ecoverseRepository.save(ecoverse);

      this.logger.verbose?.('........populating...', LogContext.BOOTSTRAP);
      await this.populateEmptyEcoverse(ecoverse);
      await this.ecoverseRepository.save(ecoverse);
      return ecoverse;
    }
    if (ecoverseCount == 1) {
      this.logger.verbose?.(
        '...single ecoverse - verified',
        LogContext.BOOTSTRAP
      );
      return ecoverseArray[0];
    }

    throw new ValidationException(
      'Cannot have more than one ecoverse',
      LogContext.BOOTSTRAP
    );
  }

  // Populate an empty ecoverse
  async populateEmptyEcoverse(ecoverse: IEcoverse): Promise<IEcoverse> {
    // Set the default values
    ecoverse.name = 'Empty ecoverse';
    if (!ecoverse.context)
      throw new EntityNotInitializedException(
        'Non-initialised ecoverse',
        LogContext.BOOTSTRAP
      );
    ecoverse.context.tagline = 'An empty ecoverse to be populated';

    return ecoverse;
  }
}
