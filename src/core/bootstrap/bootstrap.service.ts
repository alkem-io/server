import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Ecoverse } from '@domain/challenge/ecoverse/ecoverse.entity';
import { IEcoverse } from '@domain/challenge/ecoverse/ecoverse.interface';
import { EcoverseService } from '@domain/challenge/ecoverse/ecoverse.service';
import { CreateUserInput } from '@domain/community/user';
import { UserService } from '@domain/community/user/user.service';
import { IServiceConfig } from '@src/common/interfaces/service.config.interface';
import { Repository } from 'typeorm';
import fs from 'fs';
import * as defaultRoles from '@templates/authorisation-bootstrap.json';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Profiling } from '@common/decorators';
import { LogContext } from '@common/enums';
import { ILoggingConfig } from '@src/common/interfaces/logging.config.interface';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationCredential } from '@core/authorization/authorization.credential';
@Injectable()
export class BootstrapService {
  constructor(
    private ecoverseService: EcoverseService,
    private userService: UserService,
    private authorizationService: AuthorizationService,
    private configService: ConfigService,
    @InjectRepository(Ecoverse)
    private ecoverseRepository: Repository<Ecoverse>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async bootstrapEcoverse() {
    try {
      this.logger.verbose?.('Bootstrapping Ecoverse...', LogContext.BOOTSTRAP);

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

    const globalAdmins = bootstrapJson.globalAdmins;
    if (!globalAdmins) {
      this.logger.verbose?.(
        'No global admins section in the authorisation bootstrap file!',
        LogContext.BOOTSTRAP
      );
    } else {
      await this.createUserProfiles(
        globalAdmins,
        AuthorizationCredential.GlobalAdmin
      );
    }
    const communityAdmins = bootstrapJson.communityAdmins;
    if (!communityAdmins) {
      this.logger.verbose?.(
        'No community admins section in the authorisation bootstrap file!',
        LogContext.BOOTSTRAP
      );
    } else {
      await this.createUserProfiles(
        communityAdmins,
        AuthorizationCredential.GlobalAdminCommunity
      );
    }
    const members = bootstrapJson.members;
    if (!members) {
      this.logger.verbose?.(
        'No coverse members section in the authorisation bootstrap file!',
        LogContext.BOOTSTRAP
      );
    } else {
      await this.createUserProfiles(
        members,
        AuthorizationCredential.GlobalRegistered
      );
    }
  }

  @Profiling.api
  async createUserProfiles(
    usersData: any[],
    credentialType: AuthorizationCredential
  ) {
    try {
      for (const userData of usersData) {
        const userInput = new CreateUserInput();
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
          user = await this.userService.createUser(userInput);
        }
        await this.authorizationService.assignCredential({
          userID: user.id,
          type: credentialType,
        });
      }
    } catch (error) {
      this.logger.error(
        `Unable to create profiles ${error.message}`,
        error,
        LogContext.BOOTSTRAP
      );
    }
  }

  async ensureEcoverseSingleton() {
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
      const ecoverse = await this.ecoverseService.createEcoverse({
        textID: 'Eco1',
        name: 'Empty ecoverse',
      });

      this.logger.verbose?.('........populating...', LogContext.BOOTSTRAP);
      await this.populateEmptyEcoverse(ecoverse);
      await this.ecoverseRepository.save(ecoverse);
      return ecoverseArray[0];
    }
    if (ecoverseCount == 1) {
      this.logger.verbose?.(
        '...single ecoverse - verified',
        LogContext.BOOTSTRAP
      );
    }
    if (ecoverseCount > 1) {
      this.logger.warn?.(
        `...multiple ecoverses detected: ${ecoverseCount}`,
        LogContext.BOOTSTRAP
      );
    }
  }

  // Populate an empty ecoverse
  async populateEmptyEcoverse(ecoverse: IEcoverse): Promise<IEcoverse> {
    // Set the default values
    if (!ecoverse.context)
      throw new EntityNotInitializedException(
        'Non-initialised ecoverse',
        LogContext.BOOTSTRAP
      );
    ecoverse.context.tagline = 'An empty ecoverse to be populated';

    return ecoverse;
  }
}
