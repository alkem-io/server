import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Ecoverse } from 'src/domain/ecoverse/ecoverse.entity';
import { IEcoverse } from 'src/domain/ecoverse/ecoverse.interface';
import { EcoverseService } from 'src/domain/ecoverse/ecoverse.service';
import { Organisation } from 'src/domain/organisation/organisation.entity';
import { RestrictedGroupNames } from 'src/domain/user-group/user-group.entity';
import { IUserGroup } from 'src/domain/user-group/user-group.interface';
import { UserInput } from 'src/domain/user/user.dto';
import { UserService } from 'src/domain/user/user.service';
import { IServiceConfig } from 'src/interfaces/service.config.interface';
import { Repository } from 'typeorm';
import { AccountService } from '../account/account.service';

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
      await this.bootstrapProfiles();
      await this.validateAccountManagementSetup();
    } catch (error) {
      console.log(error);
    }
  }

  async bootstrapProfiles() {
    const bootstrapFilePath = this.configService.get<IServiceConfig>('service')
      ?.authorisationBootstrapPath as string;

    const bootstrapData = await import(bootstrapFilePath);
    await this.createGroupProfiles(
      RestrictedGroupNames.Admins,
      await bootstrapData[RestrictedGroupNames.Admins]
    );
    await this.createGroupProfiles(
      RestrictedGroupNames.GlobalAdmins,
      await bootstrapData[RestrictedGroupNames.GlobalAdmins]
    );
    await this.createGroupProfiles(
      RestrictedGroupNames.CommunityAdmins,
      await bootstrapData[RestrictedGroupNames.CommunityAdmins]
    );
  }

  async createGroupProfiles(groupName: string, emails: string[]) {
    try {
      emails.forEach(async email => {
        const userInput = new UserInput();
        userInput.email = email;
        userInput.name = 'Imported User';
        //env variable AUTHENTICATION_ENABLED=false. Otherwise this won't work.
        let user = await this.userService.getUserByEmail(email);

        if (!user) user = await this.userService.createUser(userInput);
        const groups = (await user.userGroups) as IUserGroup[];

        if (!groups.some(({ name }) => groupName === name))
          await this.ecoverseService.addUserToRestrictedGroup(user, groupName);
      });
    } catch (error) {
      console.log(error);
    }
  }

  async validateAccountManagementSetup() {
    console.log('=== Validating Account Management configuration ===');
    const accountsEnabled = this.accountService.accountUsageEnabled();
    if (accountsEnabled) {
      console.log('...usage of Accounts is enabled');
    } else {
      console.warn('...usage of Accounts is DISABLED');
      return;
    }
  }

  async ensureEcoverseSingleton(): Promise<IEcoverse> {
    console.log('=== Ensuring single ecoverse is present ===');
    const ecoverseArray = await this.ecoverseRepository.find();
    const ecoverseCount = ecoverseArray.length;
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
    ecoverse.context.tagline = 'An empty ecoverse to be populated';

    // Create the host organisation
    ecoverse.host = new Organisation('Default host organisation');
    ecoverse.organisations?.push(ecoverse.host);

    return ecoverse;
  }
}
