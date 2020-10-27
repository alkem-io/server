import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Ecoverse } from '../../domain/ecoverse/ecoverse.entity';
import { Context } from '../../domain/context/context.entity';
import { IEcoverse } from '../../domain/ecoverse/ecoverse.interface';
import { EcoverseService } from '../../domain/ecoverse/ecoverse.service';
import { Organisation } from '../../domain/organisation/organisation.entity';
import { RestrictedGroupNames } from '../../domain/user-group/user-group.entity';
import { UserInput } from '../../domain/user/user.dto';
import { UserService } from '../../domain/user/user.service';
import { IServiceConfig } from '../../interfaces/service.config.interface';
import { Repository } from 'typeorm';
import { AccountService } from '../account/account.service';
import fs from 'fs';
import * as defaultRoles from '../config/authorisation-bootstrap.json';
import { IUser } from '../../domain/user/user.interface';

@Injectable()
export class BootstrapService {
  constructor(
    private accountService: AccountService,
    private ecoverseService: EcoverseService,
    private userService: UserService,
    private configService: ConfigService,
    @InjectRepository(Ecoverse)
    private ecoverseRepository: Repository<Ecoverse>
  ) {}

  async bootstrapEcoverse() {
    try {
      console.info('Bootstrapping Ecoverse...');
      await this.ensureEcoverseSingleton();
      await this.validateAccountManagementSetup();
      await this.bootstrapProfiles();
    } catch (error) {
      console.log(error);
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
      console.info(
        `Authorisation bootstrap: configuration being loaded from '${bootstrapFilePath}'`
      );
      const bootstratDataStr = fs.readFileSync(bootstrapFilePath).toString();
      console.info(bootstratDataStr);
      if (!bootstratDataStr) {
        console.error('Specified authorisation bootstrap file not found!');
        return;
      }
      bootstrapJson = JSON.parse(bootstratDataStr);
    } else {
      console.info(
        'Authorisation bootstrap: default configuration being loaded'
      );
    }

    const ecoverseAdmins = bootstrapJson.ecoverseAdmins;
    if (!ecoverseAdmins)
      console.info(
        'No ecoverse admins section in the authorisation bootstrap file!'
      );
    else {
      await this.createGroupProfiles(
        RestrictedGroupNames.EcoverseAdmins,
        ecoverseAdmins
      );
    }
    const globalAdmins = bootstrapJson.globalAdmins;
    if (!globalAdmins) {
      console.info(
        'No global admins section in the authorisation bootstrap file!'
      );
    } else {
      await this.createGroupProfiles(
        RestrictedGroupNames.GlobalAdmins,
        globalAdmins
      );
    }
    const communityAdmins = bootstrapJson.communityAdmins;
    if (!communityAdmins) {
      console.info(
        'No community admins section in the authorisation bootstrap file!'
      );
    } else {
      await this.createGroupProfiles(
        RestrictedGroupNames.CommunityAdmins,
        communityAdmins
      );
    }
  }

  async createGroupProfiles(groupName: string, emails: string[]) {
    try {
      for await (const email of emails) {
        const userInput = new UserInput();
        userInput.email = email;
        userInput.name = 'Imported User';
        let user = await this.userService.getUserWithGroups(email);

        if (!user) {
          user = await this.ecoverseService.createUserProfile(userInput);
        }

        if (!user) throw new Error('Unable to create group profiles');

        const groups = (user as IUser).userGroups;
        if (!groups)
          throw new Error(
            `User ${user.email} isn't initialised properly. The user doesn't belong to any groups!`
          );

        if (!groups.some(({ name }) => groupName === name))
          await this.ecoverseService.addUserToRestrictedGroup(user, groupName);
        else
          console.info(
            `User ${userInput.email} already exists in group ${groupName}`
          );
      }
    } catch (error) {
      console.log(error);
    }
  }

  async validateAccountManagementSetup(): Promise<boolean> {
    console.log('=== Validating Account Management configuration ===');
    const accountsEnabled = this.accountService.accountUsageEnabled();
    if (accountsEnabled) {
      console.log('...usage of Accounts is enabled');
      return true;
    } else {
      console.warn('...usage of Accounts is DISABLED');
      return false;
    }
  }

  async ensureEcoverseSingleton(): Promise<IEcoverse> {
    console.log('=== Ensuring single ecoverse is present ===');
    const [
      ecoverseArray,
      ecoverseCount,
    ] = await this.ecoverseRepository.findAndCount();
    if (ecoverseCount == 0) {
      console.log('...No ecoverse present...');
      console.log('........creating...');
      // Create a new ecoverse
      const ecoverse = new Ecoverse();
      this.ecoverseService.initialiseMembers(ecoverse);
      // Save is needed so that the ecoverse is there for other methods
      await this.ecoverseRepository.save(ecoverse);

      console.log('........populating...');
      await this.populateEmptyEcoverse(ecoverse);
      await this.ecoverseRepository.save(ecoverse);
      return ecoverse as IEcoverse;
    }
    if (ecoverseCount == 1) {
      console.info('...single ecoverse - verified');
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

    // Create the host organisation
    ecoverse.host = new Organisation('Default host organisation');
    ecoverse.organisations?.push(ecoverse.host);

    return ecoverse;
  }
}
