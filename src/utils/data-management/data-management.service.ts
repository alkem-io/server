import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Challenge } from 'src/domain/challenge/challenge.entity';
import { ChallengeService } from 'src/domain/challenge/challenge.service';
import { Context } from 'src/domain/context/context.entity';
import { Ecoverse } from 'src/domain/ecoverse/ecoverse.entity';
import { EcoverseService } from 'src/domain/ecoverse/ecoverse.service';
import { Profile } from 'src/domain/profile/profile.entity';
import { Reference } from 'src/domain/reference/reference.entity';
import { TagsetService } from 'src/domain/tagset/tagset.service';
import { UserGroupService } from 'src/domain/user-group/user-group.service';
import { User } from 'src/domain/user/user.entity';
import { UserService } from 'src/domain/user/user.service';
import { Repository } from 'typeorm';
import { Connection } from 'typeorm';

@Injectable()
export class DataManagementService {
  constructor(
    private ecoverseService : EcoverseService,
    private userService : UserService,
    private userGroupService : UserGroupService,
    private tagsetService : TagsetService,
    private connection : Connection,
    private challengeService : ChallengeService,
    @InjectRepository(Ecoverse)
    private ecoverseRepository: Repository<Ecoverse>
    ) {}

  async reset_to_empty_ecoverse() {

    try
    {
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
    }
    catch(error)
    {
      console.log(error.message);
    }

  }

  async load_sample_data() {
    try
    {
      console.log('=== Ecoverse: Loading sample data ===');

      console.log('Loading sample data....');
      // Populate the Ecoverse beyond the defaults
      let ctverse = await this.ecoverseService.getEcoverse();
      if (!ctverse) {
        // No ecoverse, create one
        console.log('...no ecoverse found, creating default ecoverse...');
        ctverse = new Ecoverse();
        this.ecoverseService.initialiseMembers(ctverse);
        this.ecoverseService.populateEmptyEcoverse(ctverse);
      }

      ctverse.name = 'Cherrytwist dogfood';
      (ctverse as Ecoverse).context.tagline = 'Powering multi-stakeholder collaboration!';

      // Tags
      ctverse.tagset.tags = ['Java', 'GraphQL', 'Nature', 'Industry'];

      // Users
      const john = new User('john');
      const bob = new User('bob');
      bob.email = 'admin@cherrytwist.org';
      const valentin = new User('Valentin');
      valentin.email = 'valentin_yanakiev@yahoo.co.uk';
      const angel = new User('Angel');
      angel.email = 'angel@cmd.bg';
      const neil = new User('Neil');
      neil.email = 'neil@cherrytwist.org';
      neil.country = ' Netherlands';
      neil.gender = 'Male';
      const defaultTagset = this.tagsetService.defaultTagset(neil.profile as Profile);
      this.tagsetService.initialiseMembers(defaultTagset);
      // defaultTagset.addTag('java');
      // defaultTagset.addTag('graphql');
      const skillsTags = this.tagsetService.addTagsetWithName(neil.profile as Profile, 'Skills');
      this.tagsetService.initialiseMembers(skillsTags);
      skillsTags.tags = ['Cooking', 'Cleaning'];

      // User Groups
      const members = await this.userGroupService.getGroupByName(ctverse, 'members');
      members.members = [angel, valentin];
      members.focalPoint = angel;
      const jedi = await this.userGroupService.addGroupWithName(ctverse, 'Jedi');
      jedi.members = [john, bob];
      jedi.focalPoint = john;
      const crew = await this.userGroupService.addGroupWithName(ctverse, 'Crew');
      ctverse.groups = [jedi, crew, members];

      // Challenges
      const energyWeb = new Challenge('Energy Web');
      this.challengeService.initialiseMembers(energyWeb);
      if (!energyWeb.tagset) throw new Error('cannot reach this');
      // energyWeb.tagset.addTag('java');
      energyWeb.context = new Context();
      energyWeb.context.tagline = 'Web of energy';
      const ref1 = new Reference('video', 'http://localhost:8443/myVid', 'Video explainer for the challenge');
      const ref2 = new Reference('EnergyWeb', 'https://www.energyweb.org/', 'Official site');
      const energyWebMembers = await this.userGroupService.getGroupByName(ctverse, 'members');
      energyWebMembers.members = [angel, valentin, neil];
      energyWebMembers.focalPoint = neil;
      // energyWeb.groups = [energyWebMembers];
      energyWeb.context.references = [ref1, ref2];

      const cleanOceans = new Challenge('Clean Oceans');
      this.challengeService.initialiseMembers(cleanOceans);
      if (!cleanOceans.tagset) throw new Error('cannot reach this');
      // cleanOceans.tagset.addTag('Test');
      cleanOceans.context = new Context();
      cleanOceans.context.tagline = 'Keep our Oceans clean and in balance!';
      const cleanOceanMembers = await this.userGroupService.getGroupByName(ctverse, 'members');
      cleanOceanMembers.members = [angel, valentin, neil];
      cleanOceanMembers.focalPoint = neil;
      // cleanOceans.groups = [crew, cleanOceanMembers];

      const cargoInsurance = new Challenge('Cargo Insurance');
      this.challengeService.initialiseMembers(cargoInsurance);
      if (!cargoInsurance.tagset) throw new Error('cannot reach this');
      // cargoInsurance.tagset.addTag('Logistics');
      cargoInsurance.context = new Context();
      cargoInsurance.context.tagline = 'In an interconnected world, how to manage risk along the chain?';
      const cargoInsuranceMembers = await this.userGroupService.getGroupByName(ctverse, 'members');
      cargoInsuranceMembers.members = [angel, valentin, neil];
      cargoInsuranceMembers.focalPoint = angel;
      // cargoInsurance.groups = [cargoInsuranceMembers];

      ctverse.challenges = [cleanOceans, energyWeb, cargoInsurance];
      // Load in a full challenge from a json file
      //const rawdata = fs.readFileSync('./src/db-mgmt/challenge-balance-the-grid.json');
      //const balanceGrid = JSON.parse(String(rawdata));

      //const balanceGridStr = JSON.stringify(balanceGrid, null, 4);
      //console.log(`Generated challenge ${balanceGridStr}`);

      //Organisations
      await this.ecoverseRepository.save(ctverse);

      // await this.connection.manager.save(ctverse);
    }
    catch(error)
    {
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
