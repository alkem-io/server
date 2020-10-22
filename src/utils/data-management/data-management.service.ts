import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChallengeInput } from 'src/domain/challenge/challenge.dto';
import { IChallenge } from 'src/domain/challenge/challenge.interface';
import { Ecoverse } from 'src/domain/ecoverse/ecoverse.entity';
import { EcoverseService } from 'src/domain/ecoverse/ecoverse.service';
import { ProfileService } from 'src/domain/profile/profile.service';
import { Reference } from 'src/domain/reference/reference.entity';
import { TagsetService } from 'src/domain/tagset/tagset.service';
import { IUserGroup } from 'src/domain/user-group/user-group.interface';
import { UserGroupService } from 'src/domain/user-group/user-group.service';
import { UserInput } from 'src/domain/user/user.dto';
import { IUser } from 'src/domain/user/user.interface';
import { UserService } from 'src/domain/user/user.service';
import { Repository } from 'typeorm';
import { Connection } from 'typeorm';
import { BootstrapService } from '../bootstrap/bootstrap.service';

@Injectable()
export class DataManagementService {
  constructor(
    private bootstrapService: BootstrapService,
    private ecoverseService: EcoverseService,
    private userService: UserService,
    private userGroupService: UserGroupService,
    private profileService: ProfileService,
    private tagsetService: TagsetService,
    private connection: Connection,
    @InjectRepository(Ecoverse)
    private ecoverseRepository: Repository<Ecoverse>
  ) {}

  async reset_to_empty_ecoverse(): Promise<string> {
    const msgs: string[] = [];
    try {
      this.addLogMsg(msgs, 'Dropping existing database... ');
      await this.connection.dropDatabase();
      await this.connection.synchronize();
      this.addLogMsg(msgs, '.....dropped.');

      // Create new Ecoverse
      this.addLogMsg(msgs, 'Populating empty ecoverse... ');
      await this.bootstrapService.bootstrapEcoverse();
      this.addLogMsg(msgs, '.....populated.');
    } catch (error) {
      this.addLogMsg(msgs, error.message);
    }
    return msgs.toString();
  }

  addLogMsg(msgs: string[], msg: string) {
    msgs.push(msg);
    console.log(msg);
  }

  async load_sample_data(): Promise<string> {
    const msgs: string[] = [];
    try {
      this.addLogMsg(msgs, '=== Ecoverse: Loading sample data ===');

      this.addLogMsg(msgs, 'Loading sample data....');
      // Populate the Ecoverse beyond the defaults
      const ctverse = await this.ecoverseService.getEcoverse({
        relations: ['groups'],
      });

      ctverse.name = 'Cherrytwist dogfood';
      (ctverse as Ecoverse).context.tagline =
        'Powering multi-stakeholder collaboration!';

      const membersGroup = await this.userGroupService.getGroupByName(
        ctverse,
        'members'
      );
      // Users
      const john = await this.createUser('john', 'john@test.com', membersGroup);
      const bob = await this.createUser(
        'bob',
        'bob@cherrytwist.org',
        membersGroup
      );
      const valentin = await this.createUser(
        'Valentin',
        'valentin_yanakiev@yahoo.co.uk',
        membersGroup
      );
      const angel = await this.createUser(
        'Angel',
        'angel@cmd.bg',
        membersGroup
      );
      const neil = await this.createUser(
        'Neil',
        'neil@cherrytwist.org',
        membersGroup
      );
      neil.email = 'neil@cherrytwist.org';
      neil.country = ' Netherlands';
      neil.gender = 'Male';
      const tagset = await this.profileService.createTagset(
        neil.profile.id,
        'sample2'
      );
      await this.tagsetService.replaceTags(tagset.id, ['java', 'graphql']);

      // User Groups
      const jediGroup = await this.ecoverseService.createGroup('jedi');
      await this.userGroupService.addUserToGroup(angel, jediGroup);
      await this.userGroupService.addUserToGroup(john, jediGroup);
      await this.userGroupService.addUserToGroup(bob, jediGroup);
      const crewGroup = await this.ecoverseService.createGroup('crew');
      await this.userGroupService.addUserToGroup(valentin, crewGroup);
      await this.userGroupService.addUserToGroup(neil, crewGroup);

      // Challenges
      const energyWeb = await this.createChallenge('Energy Web');
      energyWeb.context.tagline = 'Web of energy';
      energyWeb.tagset.tags = ['java', 'graphql'];
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
      const energyWebMembers = await this.userGroupService.getGroupByName(
        energyWeb,
        'members'
      );
      await this.userGroupService.addUserToGroup(angel, energyWebMembers);
      await this.userGroupService.addUserToGroup(valentin, energyWebMembers);
      await this.userGroupService.addUserToGroup(neil, energyWebMembers);
      energyWebMembers.focalPoint = neil;
      energyWeb.context.references = [ref1, ref2];

      const cleanOceans = await this.createChallenge('Clean Oceans');
      cleanOceans.tagset.tags = ['java', 'linux'];
      cleanOceans.context.tagline = 'Keep our Oceans clean and in balance!';
      const cleanOceanMembers = await this.userGroupService.getGroupByName(
        cleanOceans,
        'members'
      );
      await this.userGroupService.addUserToGroup(angel, cleanOceanMembers);
      await this.userGroupService.addUserToGroup(valentin, cleanOceanMembers);
      await this.userGroupService.addUserToGroup(neil, cleanOceanMembers);
      cleanOceanMembers.focalPoint = neil;

      const cargoInsurance = await this.createChallenge('Cargo Insurance');
      cargoInsurance.tagset.tags = ['logistics', 'eco'];
      cargoInsurance.context.tagline =
        'In an interconnected world, how to manage risk along the chain?';
      const cargoInsuranceMembers = await this.userGroupService.getGroupByName(
        cargoInsurance,
        'members'
      );
      await this.userGroupService.addUserToGroup(bob, cargoInsuranceMembers);
      cargoInsuranceMembers.focalPoint = bob;

      // Persist the ecoverse
      await this.ecoverseRepository.save(ctverse);
      this.addLogMsg(msgs, '...loading of sample data completed successfully');
    } catch (error) {
      this.addLogMsg(msgs, error.message);
    }
    return msgs.toString();
  }

  // Note: this goes to the user service as opposed to ecoverse service to avoid dealing with accounts
  async createUser(
    name: string,
    email: string,
    membersGroup: IUserGroup
  ): Promise<IUser> {
    const userInput = new UserInput();
    userInput.name = name;
    userInput.email = email;

    const user = await this.userService.createUser(userInput);

    await this.userGroupService.addUserToGroup(user, membersGroup);

    return user;
  }

  async createChallenge(name: string): Promise<IChallenge> {
    const challengeInput = new ChallengeInput();
    challengeInput.name = name;

    const challenge = await this.ecoverseService.createChallenge(
      challengeInput
    );

    return challenge;
  }

  async reset_to_empty_db(): Promise<string> {
    const msgs: string[] = [];
    try {
      this.addLogMsg(msgs, 'Dropping existing database... ');
      await this.connection.dropDatabase();
      await this.connection.synchronize();
      this.addLogMsg(msgs, '.....dropped. Completed successfully.');
    } catch (error) {
      console.log(error.message);
    }
    return msgs.toString();
  }

  async populatePageContent(message: string): Promise<string> {
    let ecoverseName = '<< No ecoverse >>';
    try {
      const ecoverse = await this.ecoverseService.getEcoverse();
      ecoverseName = ecoverse.name;
    } catch (e) {
      // ecoverse not yet initialised so just skip the name
      console.log(e);
    }
    const content = `<!DOCTYPE html>
    <html>
    <body>
    <h1>Cherrytwist Data Management Utility</h1>
    <h2>Ecoverse: <i>${ecoverseName}</i></H2>
    <p>
    <b>Messages:</b>${message}</p>
    <p><form action="/data-management/empty-ecoverse">
    <input type="submit" value="Reset Ecoverse" />
    </form></p>
    <p><form action="/data-management/seed-data">
    <input type="submit" value="Sample Data" />
    </form></p>
    </body>
    </html>`;
    return content;
  }
}
