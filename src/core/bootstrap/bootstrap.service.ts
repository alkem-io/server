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
import { LogContext } from '@common/enums';
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

      Profiling.logger = this.logger;
      const profilingEnabled = this.configService.get('monitoring')?.logging
        ?.profilingEnabled;
      if (profilingEnabled) Profiling.profilingEnabled = profilingEnabled;
      this.logger.verbose?.('Bootstrapping Ecoverse...', LogContext.BOOTSTRAP);

      // Now setup the rest...
      await this.ensureEcoverseSingleton();
      await this.bootstrapProfiles();
    } catch (error) {
      throw new BootstrapException(error.message);
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
    const bootstrapFilePath = this.configService.get('bootstrap')
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
        // If the user does not exist create + add credentials
        let user = await this.userService.getUserByEmail(userData.email);
        if (!user) {
          user = await this.userService.createUser({
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
      '=== Ensuring single ecoverse is present ===',
      LogContext.BOOTSTRAP
    );
    const ecoverseCount = await this.ecoverseRepository.count();
    if (ecoverseCount == 0) {
      this.logger.verbose?.('...No ecoverse present...', LogContext.BOOTSTRAP);
      this.logger.verbose?.('........creating...', LogContext.BOOTSTRAP);
      // Create a new ecoverse
      const ecoverse = await this.ecoverseService.createEcoverse({
        textID: 'Eco1',
        name: 'Empty ecoverse',
        context: {
          tagline: 'An empty ecoverse to be populated',
        },
      });

      this.logger.verbose?.('........populating...', LogContext.BOOTSTRAP);
      await this.ecoverseRepository.save(ecoverse);
      return ecoverse;
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
}
