import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Ecoverse } from '@domain/challenge/ecoverse/ecoverse.entity';
import { EcoverseService } from '@domain/challenge/ecoverse/ecoverse.service';
import { UserService } from '@domain/community/user/user.service';
import { Repository } from 'typeorm';
import fs from 'fs';
import * as defaultRoles from '@templates/authorisation-bootstrap.json';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Profiling } from '@common/decorators';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { BootstrapException } from '@common/exceptions/bootstrap.exception';
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
      this.logConfiguration();

      Profiling.logger = this.logger;
      const profilingEnabled = this.configService.get(
        ConfigurationTypes.Monitoring
      )?.logging?.profilingEnabled;
      if (profilingEnabled) Profiling.profilingEnabled = profilingEnabled;

      await this.ensureEcoverseSingleton();
      await this.bootstrapProfiles();
    } catch (error) {
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
    const bootstrapFilePath = this.configService.get(
      ConfigurationTypes.Bootstrap
    )?.authorisationBootstrapPath as string;

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
        throw new BootstrapException(
          'Specified authorisation bootstrap file not found!'
        );
      }
      bootstrapJson = JSON.parse(bootstratDataStr);
    } else {
      this.logger.verbose?.(
        'Authorisation bootstrap: default configuration being loaded',
        LogContext.BOOTSTRAP
      );
    }

    const users = bootstrapJson.users;
    if (!users) {
      this.logger.verbose?.(
        'No users section in the authorisation bootstrap file!',
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
          const user = await this.userService.createUser({
            email: userData.email,
            accountUpn: userData.email,
            name: `${userData.firstName} ${userData.lastName}`,
            firstName: userData.firstName,
            lastName: userData.lastName,
          });
          const credentialsData = userData.credentials;
          for (const credentialData of credentialsData) {
            await this.authorizationService.grantCredential({
              userID: user.id,
              type: credentialData.type,
              resourceID: credentialData.resourceID,
            });
          }
        }
      }
    } catch (error) {
      throw new BootstrapException(
        `Unable to create profiles ${error.message}`
      );
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
      return await this.ecoverseService.createEcoverse({
        nameID: 'Eco1',
        displayName: 'Empty ecoverse',
        context: {
          tagline: 'An empty ecoverse to be populated',
        },
      });
    }
  }
}
