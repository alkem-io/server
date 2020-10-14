import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Challenge } from 'src/domain/challenge/challenge.entity';
import { ChallengeService } from 'src/domain/challenge/challenge.service';
import { Ecoverse } from 'src/domain/ecoverse/ecoverse.entity';
import { EcoverseService } from 'src/domain/ecoverse/ecoverse.service';
import { Reference } from 'src/domain/reference/reference.entity';
import { Tagset } from 'src/domain/tagset/tagset.entity';
import { UserGroupService } from 'src/domain/user-group/user-group.service';
import { User } from 'src/domain/user/user.entity';
import { UserService } from 'src/domain/user/user.service';
import { Repository } from 'typeorm';
import { Connection } from 'typeorm';

@Injectable()
export class DataManagementService {
  constructor(
    private ecoverseService: EcoverseService,
    private userService: UserService,
    private userGroupService: UserGroupService,
    private connection: Connection,
    private challengeService: ChallengeService,
    @InjectRepository(Ecoverse)
    private ecoverseRepository: Repository<Ecoverse>
  ) {}

  async reset_to_empty_ecoverse() {
    try {
      console.log('Dropping existing database... ');
      await this.connection.dropDatabase();
      await this.connection.synchronize();
      console.log('.....dropped.');

      // Create new Ecoverse
      console.log('Populating empty ecoverse... ');
      const ctverse = new Ecoverse();
      this.ecoverseService.initialiseMembers(ctverse);
      this.ecoverseService.populateEmptyEcoverse(ctverse);

      await this.ecoverseRepository.save(ctverse);
      console.log('.....populated.');
    } catch (error) {
      console.log(error.message);
    }
  }

  async load_sample_data() {
    try {
      console.log('=== Ecoverse: Loading sample data ===');

      console.log('Loading sample data....');
      // Populate the Ecoverse beyond the defaults
      const ctverse = await this.ecoverseService.getEcoverse();

      ctverse.name = 'Cherrytwist dogfood';
      (ctverse as Ecoverse).context.tagline =
        'Powering multi-stakeholder collaboration!';

      const membersGroup = this.userGroupService.getGroupByName(
        ctverse,
        'members'
      );

      // Users
      const john = new User('john');
      this.userService.initialiseMembers(john);
      const bob = new User('bob');
      this.userService.initialiseMembers(bob);
      bob.email = 'admin@cherrytwist.org';
      const valentin = new User('Valentin');
      this.userService.initialiseMembers(valentin);
      valentin.email = 'valentin_yanakiev@yahoo.co.uk';
      const angel = new User('Angel');
      this.userService.initialiseMembers(angel);
      angel.email = 'angel@cmd.bg';
      const neil = new User('Neil');
      this.userService.initialiseMembers(neil);
      neil.email = 'neil@cherrytwist.org';
      neil.country = ' Netherlands';
      neil.gender = 'Male';
      const tagset = new Tagset('sample');
      tagset.tags = ['java', 'graphql'];
      neil.profile?.tagsets?.push(tagset);

      // Add the users to the groups
      membersGroup.members?.push(john);
      membersGroup.members?.push(bob);
      membersGroup.members?.push(valentin);
      membersGroup.members?.push(neil);
      membersGroup.members?.push(angel);

      // User Groups
      const jediGroup = await this.ecoverseService.createGroup('jedi');
      this.userGroupService.addUserToGroup(angel, jediGroup);
      this.userGroupService.addUserToGroup(john, jediGroup);
      const crewGroup = await this.ecoverseService.createGroup('crew');
      this.userGroupService.addUserToGroup(valentin, crewGroup);
      this.userGroupService.addUserToGroup(neil, crewGroup);

      // Challenges
      const energyWeb = new Challenge('Energy Web');
      this.challengeService.initialiseMembers(energyWeb);
      if (!energyWeb.tagset) throw new Error('cannot reach this');
      energyWeb.tagset.tags = ['java', 'graphql'];
      energyWeb.context.tagline = 'Web of energy';
      const ref1 = new Reference(
        'video',
        'http://localhost:8443/myVid',
        'Video explainer for the challenge'
      );
      const ref2 = new Reference(
        'EnergyWeb',
        'https://www.energyweb.org/',
        'Official site'
      );
      const energyWebMembers = this.userGroupService.getGroupByName(
        energyWeb,
        'members'
      );
      energyWebMembers.members = [angel, valentin, neil];
      energyWebMembers.focalPoint = neil;
      energyWeb.context.references = [ref1, ref2];

      const cleanOceans = new Challenge('Clean Oceans');
      this.challengeService.initialiseMembers(cleanOceans);
      if (!cleanOceans.tagset) throw new Error('cannot reach this');
      cleanOceans.tagset.tags = ['java', 'linux'];
      cleanOceans.context.tagline = 'Keep our Oceans clean and in balance!';
      const cleanOceanMembers = this.userGroupService.getGroupByName(
        cleanOceans,
        'members'
      );
      cleanOceanMembers.members = [angel, valentin, neil];
      cleanOceanMembers.focalPoint = neil;

      const cargoInsurance = new Challenge('Cargo Insurance');
      this.challengeService.initialiseMembers(cargoInsurance);
      if (!cargoInsurance.tagset) throw new Error('cannot reach this');
      cargoInsurance.tagset.tags = ['logistics', 'eco'];
      cargoInsurance.context.tagline =
        'In an interconnected world, how to manage risk along the chain?';
      const cargoInsuranceMembers = this.userGroupService.getGroupByName(
        cargoInsurance,
        'members'
      );
      cargoInsuranceMembers.members = [angel, valentin, neil];
      cargoInsuranceMembers.focalPoint = angel;

      ctverse.challenges = [cleanOceans, energyWeb, cargoInsurance];

      // Persist the ecoverse
      await this.ecoverseRepository.save(ctverse);
      console.log('...loading of sample data completed successfully');
    } catch (error) {
      console.log(error.message);
    }
  }

  async reset_to_empty_db() {
    try {
      console.log('Dropping existing database... ');
      await this.connection.dropDatabase();
      await this.connection.synchronize();
      console.log('.....dropped.');
    } catch (error) {
      console.log(error.message);
    }
  }
}
