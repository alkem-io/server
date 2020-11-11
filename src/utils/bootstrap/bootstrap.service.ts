import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Ecoverse } from '../../domain/ecoverse/ecoverse.entity';
import { Context } from '../../domain/context/context.entity';
import { IEcoverse } from '../../domain/ecoverse/ecoverse.interface';
import { EcoverseService } from '../../domain/ecoverse/ecoverse.service';
import { RestrictedGroupNames } from '../../domain/user-group/user-group.entity';
import { UserInput } from '../../domain/user/user.dto';
import { UserService } from '../../domain/user/user.service';
import { IServiceConfig } from '../../interfaces/service.config.interface';
import { Repository } from 'typeorm';
import { AccountService } from '../account/account.service';
import fs from 'fs';
import * as defaultRoles from '../config/authorisation-bootstrap.json';
import * as defaultTemplates from '../config/templates-bootstrap.json';
import { IUser } from '../../domain/user/user.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TemplateService } from '../../domain/template/template.service';
import { TemplateInput } from '../../domain/template/template.dto';
import { ProfileService } from '../../domain/profile/profile.service';
import { TagsetService } from '../../domain/tagset/tagset.service';
import { ReferenceInput } from '../../domain/reference/reference.dto';
import { Profiling } from '../logging/logging.profiling.decorator';
import { LogContexts } from '../logging/logging.contexts';
import { ILoggingConfig } from '../../interfaces/logging.config.interface';

@Injectable()
export class BootstrapService {
  constructor(
    private accountService: AccountService,
    private ecoverseService: EcoverseService,
    private userService: UserService,
    private profileService: ProfileService,
    private tagsetService: TagsetService,
    private configService: ConfigService,
    private templateService: TemplateService,
    @InjectRepository(Ecoverse)
    private ecoverseRepository: Repository<Ecoverse>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger
  ) {}

  async bootstrapEcoverse() {
    try {
      this.logger.verbose('Bootstrapping Ecoverse...');

      Profiling.logger = this.logger;
      const profilingEnabled = this.configService.get<ILoggingConfig>('logging')
        ?.profilingEnabled;
      if (profilingEnabled) Profiling.profilingEnabled = profilingEnabled;
      this.logger.verbose('Bootstrapping Ecoverse...', LogContexts.BOOTSTRAP);

      // Now setup the rest...
      await this.ensureEcoverseSingleton();
      await this.validateAccountManagementSetup();
      await this.bootstrapProfiles();
      await this.bootstrapTemplates();
    } catch (error) {
      this.logger.error(error, undefined, LogContexts.BOOTSTRAP);
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
      this.logger.verbose(
        `Authorisation bootstrap: configuration being loaded from '${bootstrapFilePath}'`,
        LogContexts.BOOTSTRAP
      );
      const bootstratDataStr = fs.readFileSync(bootstrapFilePath).toString();
      this.logger.verbose(bootstratDataStr);
      if (!bootstratDataStr) {
        this.logger.error(
          'Specified authorisation bootstrap file not found!',
          undefined,
          LogContexts.BOOTSTRAP
        );
        return;
      }
      bootstrapJson = JSON.parse(bootstratDataStr);
    } else {
      this.logger.verbose(
        'Authorisation bootstrap: default configuration being loaded',
        LogContexts.BOOTSTRAP
      );
    }

    const ecoverseAdmins = bootstrapJson.ecoverseAdmins;
    if (!ecoverseAdmins)
      this.logger.verbose(
        'No ecoverse admins section in the authorisation bootstrap file!',
        LogContexts.BOOTSTRAP
      );
    else {
      await this.createGroupProfiles(
        RestrictedGroupNames.EcoverseAdmins,
        ecoverseAdmins
      );
    }
    const globalAdmins = bootstrapJson.globalAdmins;
    if (!globalAdmins) {
      this.logger.verbose(
        'No global admins section in the authorisation bootstrap file!',
        LogContexts.BOOTSTRAP
      );
    } else {
      await this.createGroupProfiles(
        RestrictedGroupNames.GlobalAdmins,
        globalAdmins
      );
    }
    const communityAdmins = bootstrapJson.communityAdmins;
    if (!communityAdmins) {
      this.logger.verbose(
        'No community admins section in the authorisation bootstrap file!',
        LogContexts.BOOTSTRAP
      );
    } else {
      await this.createGroupProfiles(
        RestrictedGroupNames.CommunityAdmins,
        communityAdmins
      );
    }
  }

  @Profiling.api
  async createGroupProfiles(groupName: string, usersData: any[]) {
    try {
      for (let i = 0; i < usersData.length; i++) {
        const userData = usersData[i];
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
          user = await this.ecoverseService.createUserProfile(userInput);
        }
        user = await this.userService.getUserWithGroups(userInput.email);

        if (!user) throw new Error('Unable to create group profiles');

        const groups = (user as IUser).userGroups;
        if (!groups)
          throw new Error(
            `User ${user.email} isn't initialised properly. The user doesn't belong to any groups!`
          );

        if (!groups.some(({ name }) => groupName === name))
          await this.ecoverseService.addUserToRestrictedGroup(user, groupName);
        else
          this.logger.verbose(
            `User ${userInput.email} already exists in group ${groupName}`,
            LogContexts.BOOTSTRAP
          );
      }
    } catch (error) {
      this.logger.error(
        `Unable to create profiles ${error.message}`,
        error,
        LogContexts.BOOTSTRAP
      );
    }
  }

  async validateAccountManagementSetup(): Promise<boolean> {
    this.logger.verbose(
      '=== Validating Account Management configuration ===',
      LogContexts.BOOTSTRAP
    );
    const accountsEnabled = this.accountService.accountUsageEnabled();
    if (accountsEnabled) {
      this.logger.verbose(
        '...usage of Accounts is enabled',
        LogContexts.BOOTSTRAP
      );
      return true;
    } else {
      this.logger.warn(
        '...usage of Accounts is DISABLED',
        LogContexts.BOOTSTRAP
      );
      return false;
    }
  }

  async ensureEcoverseSingleton(): Promise<IEcoverse> {
    this.logger.verbose(
      '=== Ensuring single ecoverse is present ===',
      LogContexts.BOOTSTRAP
    );
    const [
      ecoverseArray,
      ecoverseCount,
    ] = await this.ecoverseRepository.findAndCount();
    if (ecoverseCount == 0) {
      this.logger.verbose('...No ecoverse present...', LogContexts.BOOTSTRAP);
      this.logger.verbose('........creating...', LogContexts.BOOTSTRAP);
      // Create a new ecoverse
      const ecoverse = new Ecoverse();
      await this.ecoverseService.initialiseMembers(ecoverse);
      // Save is needed so that the ecoverse is there for other methods
      await this.ecoverseRepository.save(ecoverse);

      this.logger.verbose('........populating...', LogContexts.BOOTSTRAP);
      await this.populateEmptyEcoverse(ecoverse);
      await this.ecoverseRepository.save(ecoverse);
      return ecoverse as IEcoverse;
    }
    if (ecoverseCount == 1) {
      this.logger.verbose(
        '...single ecoverse - verified',
        LogContexts.BOOTSTRAP
      );
      return ecoverseArray[0] as IEcoverse;
    }

    throw new Error('Cannot have more than one ecoverse');
  }

  // Populate an empty ecoverse
  async populateEmptyEcoverse(ecoverse: IEcoverse): Promise<IEcoverse> {
    // Set the default values
    ecoverse.name = 'Empty ecoverse';
    if (!ecoverse.context) ecoverse.context = new Context();
    ecoverse.context.tagline = 'An empty ecoverse to be populated';

    return ecoverse;
  }

  async bootstrapTemplates() {
    // Check if the ecoverse already has a template, if not then instantiate one
    const ecoverseID = await this.ecoverseService.getEcoverseId();
    const existingTemplates = await this.templateService.getTemplates(
      ecoverseID
    );
    if (existingTemplates && existingTemplates.length > 0) {
      this.logger.verbose(
        'Ecoverse already has at least one template; skipping loading of templates',
        LogContexts.BOOTSTRAP
      );
      return;
    }
    // No templates so load them
    const bootstrapFilePath = this.configService.get<IServiceConfig>('service')
      ?.templatesBootstrapPath as string;

    let bootstrapJson = {
      ...defaultTemplates,
    };

    if (
      bootstrapFilePath &&
      fs.existsSync(bootstrapFilePath) &&
      fs.statSync(bootstrapFilePath).isFile()
    ) {
      this.logger.warn(
        `Templates bootstrap: configuration being loaded from '${bootstrapFilePath}'`,
        LogContexts.BOOTSTRAP
      );
      const bootstratDataStr = fs.readFileSync(bootstrapFilePath).toString();
      this.logger.verbose(bootstratDataStr);
      if (!bootstratDataStr) {
        this.logger.error(
          'Specified templates bootstrap file not found!',
          LogContexts.BOOTSTRAP
        );
        return;
      }
      bootstrapJson = JSON.parse(bootstratDataStr);
    } else {
      this.logger.verbose(
        'Templates bootstrap: default configuration being loaded',
        LogContexts.BOOTSTRAP
      );
    }

    const templatesJson = bootstrapJson.templates;
    for await (const templateJson of templatesJson) {
      // Create and instantiate a new template
      const templateData = new TemplateInput();
      templateData.name = templateJson.name;
      templateData.description = templateJson.description;
      const template = await this.ecoverseService.createTemplate(templateData);

      // Create the users
      for await (const userJson of templateJson.users) {
        const userData = new UserInput();
        userData.firstName = userJson.firstName;
        userData.lastName = userJson.lastName;
        userData.name = userJson.name;
        userData.email = userJson.email;
        // Create directly on userservice to not add to members group
        const user = await this.userService.createUser(userData);
        template.users?.push(user);
        // save the template again for each user, to reflect user assignment to template
        await this.templateService.save(template);
        if (!user.profile) throw new Error(`Non-initialised user: ${user.id}`);
        const profileId = user.profile.id;

        // Add the tagsets
        const tagsetsJson = userJson.profile.tagsets;
        for await (const tagsetJson of tagsetsJson) {
          const tagset = await this.profileService.createTagset(
            profileId,
            tagsetJson.name
          );
          await this.tagsetService.replaceTags(tagset.id, tagsetJson.tags);
          this.logger.verbose(
            `Templates bootstrap: added tagset with name ${tagset.name}`,
            LogContexts.BOOTSTRAP
          );
        }

        // Add the tagsets + references
        const referencesJson = userJson.profile.references;
        for await (const referenceJson of referencesJson) {
          const refData = new ReferenceInput();
          refData.name = referenceJson.name;
          refData.uri = referenceJson.uri;
          refData.description = '';
          const reference = await this.profileService.createReference(
            profileId,
            refData
          );
          this.logger.verbose(
            `Templates bootstrap: added reference with name ${reference.name}`,
            LogContexts.BOOTSTRAP
          );
        }
      }

      this.logger.verbose(
        `Templates bootstrap: created a new template with name: '${template.name}'`,
        LogContexts.BOOTSTRAP
      );
    }
  }
}
