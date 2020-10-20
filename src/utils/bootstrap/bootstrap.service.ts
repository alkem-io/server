import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Ecoverse } from 'src/domain/ecoverse/ecoverse.entity';
import { IEcoverse } from 'src/domain/ecoverse/ecoverse.interface';
import { EcoverseService } from 'src/domain/ecoverse/ecoverse.service';
import { Organisation } from 'src/domain/organisation/organisation.entity';
import { UserInput } from 'src/domain/user/user.dto';
import { IUser } from 'src/domain/user/user.interface';
import { UserService } from 'src/domain/user/user.service';
import { Repository } from 'typeorm';
import { AccountService } from '../account/account.service';

const ADMIN_EMAIL = 'admin@cherrytwist.org';
@Injectable()
export class BootstrapService {
  constructor(
    private accountService: AccountService,
    private ecoverseService: EcoverseService,
    private userService: UserService,
    @InjectRepository(Ecoverse)
    private ecoverseRepository: Repository<Ecoverse>
  ) {}

  async bootstrapEcoverse() {
    try {
      console.info('Bootstrapping Ecoverse...');
      await this.ensureEcoverseSingleton();
      await this.ensureAdminRole();
      await this.validateAccountManagementSetup();
    } catch (error) {
      console.log(error);
    }
  }

  async validateAccountManagementSetup() {
    console.log('=== Validating Account Management configuration ===');
    const accountsEnabled = await this.accountService.accountUsageEnabled();
    if (accountsEnabled) {
      console.log('...usage of Accounts is enabled');
    } else {
      console.warn('...usage of Accounts is DISABLED');
      return;
    }
  }

  async ensureAdminRole() {
    console.log('=== Ensuring admin user is present ===');
    // Ensure user exists with admin email
    let user = await this.userService.getUserByEmail(ADMIN_EMAIL);

    if (!user) {
      console.info(
        `...no admin user present, creating user with email ${ADMIN_EMAIL}`
      );
      // No user with admin email, so create + add
      const ctAdminDto = new UserInput();
      ctAdminDto.name = 'ctAdmin';
      ctAdminDto.email = ADMIN_EMAIL;
      ctAdminDto.lastName = 'admin';

      user = await this.ecoverseService.createUser(ctAdminDto);
    }

    // Ensure admin user is assigned to admin group
    if (await this.ecoverseService.addAdmin(user as IUser)) {
      console.info(
        `...${
          (user as IUser).email
        } added to the admins group on Ecoverse level`
      );
    }
    console.info('...administration role - presence verified');
    return;
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
