import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChallengeInput } from '@domain/challenge/challenge.dto';
import { IChallenge } from '@domain/challenge/challenge.interface';
import { Ecoverse } from '@domain/ecoverse/ecoverse.entity';
import { EcoverseService } from '@domain/ecoverse/ecoverse.service';
import { ProfileService } from '@domain/profile/profile.service';
import { Reference } from '@domain/reference/reference.entity';
import { Context } from '@domain/context/context.entity';
import { TagsetService } from '@domain/tagset/tagset.service';
import { IUserGroup } from '@domain/user-group/user-group.interface';
import { UserGroupService } from '@domain/user-group/user-group.service';
import { UserInput } from '@domain/user/user.dto';
import { IUser } from '@domain/user/user.interface';
import { UserService } from '@domain/user/user.service';
import { Connection, Repository } from 'typeorm';
import { BootstrapService } from '../bootstrap/bootstrap.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@utils/logging/logging.contexts';
import { EntityNotInitializedException } from '@utils/error-handling/exceptions/entity.not.initialized.exception';
import { exec } from 'child_process';

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
    private ecoverseRepository: Repository<Ecoverse>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async reset_to_empty_ecoverse(): Promise<string> {
    const msgs: string[] = [];
    try {
      this.addLogMsg(msgs, 'Dropping existing database... ');
      await this.connection.dropDatabase();
      this.addLogMsg(msgs, '.....dropped.');

      try {
        await new Promise<void>((resolve, reject) => {
          exec('npm run migration:run', (error, _stdout, _stderr) => {
            this.addLogMsg(msgs, 'Running Migrations...');
            if (error !== null) {
              // Reject if there is an error:
              return reject(error);
            }
            // Otherwise resolve the promise:
            resolve();
          });
        });
      } catch (error) {
        //Gracefully handling the error if you start spamming the button as it will try creating multiple migrations.
        //only one migration will succeed as they are transactional, the rest will return an error. No need to show it to the client.
        console.log(`exec error: ${error}`);
      }

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
    this.logger.verbose?.(msg, LogContext.DATA_MGMT);
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
      if (!ctverse.context) ctverse.context = new Context();
      ctverse.context.tagline = 'Powering multi-stakeholder collaboration!';

      const membersGroup = await this.userGroupService.getGroupByName(
        ctverse,
        'members'
      );
      // Users
      const john = await this.createUser(
        'John',
        'Doe',
        'john@test.com',
        membersGroup
      );
      const bob = await this.createUser(
        'Bob',
        'Cat',
        'bob@cherrytwist.org',
        membersGroup
      );
      const jane = await this.createUser(
        'Jane',
        'Doh',
        'jane@yahoo.co.uk',
        membersGroup
      );
      const clint = await this.createUser(
        'Clint',
        'Eastwood',
        'clint@eastwood.com',
        membersGroup
      );
      const bruce = await this.createUser(
        'Bruce',
        'Lee',
        'bruce.lee@martialarts.com',
        membersGroup
      );
      bruce.country = ' Netherlands';
      bruce.gender = 'Male';
      if (!bruce.profile)
        throw new EntityNotInitializedException(
          'Non-initalised user',
          LogContext.DATA_MGMT
        );
      const tagset = await this.profileService.createTagset(
        bruce.profile.id,
        'sample2'
      );
      await this.tagsetService.replaceTags(tagset.id, ['java', 'graphql']);

      // User Groups
      const jediGroup = await this.ecoverseService.createGroup('jedi');
      await this.userGroupService.addUserToGroup(bruce, jediGroup);
      await this.userGroupService.addUserToGroup(jane, jediGroup);
      await this.userGroupService.addUserToGroup(bob, jediGroup);
      const crewGroup = await this.ecoverseService.createGroup('crew');
      await this.userGroupService.addUserToGroup(john, crewGroup);
      await this.userGroupService.addUserToGroup(clint, crewGroup);

      // Challenges
      const energyWeb = await this.createChallenge(
        'Energy Web',
        'energy-web',
        'Web of energy',
        ['java', 'graphql']
      );
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
      await this.userGroupService.addUserToGroup(jane, energyWebMembers);
      await this.userGroupService.addUserToGroup(clint, energyWebMembers);
      await this.userGroupService.addUserToGroup(bruce, energyWebMembers);
      energyWebMembers.focalPoint = jane;
      if (!energyWeb.context)
        throw new EntityNotInitializedException(
          'Context not initilised',
          LogContext.DATA_MGMT
        );
      energyWeb.context.references = [ref1, ref2];

      const cleanOceans = await this.createChallenge(
        'Clean Oceans',
        'clean-oceans',
        'Keep our Oceans clean and in balance!',
        ['java', 'linux']
      );

      const cleanOceanMembers = await this.userGroupService.getGroupByName(
        cleanOceans,
        'members'
      );
      await this.userGroupService.addUserToGroup(john, cleanOceanMembers);
      await this.userGroupService.addUserToGroup(bob, cleanOceanMembers);
      await this.userGroupService.addUserToGroup(bruce, cleanOceanMembers);
      cleanOceanMembers.focalPoint = bruce;

      const cargoInsurance = await this.createChallenge(
        'Cargo Insurance',
        'cargo-insurance',
        'In an interconnected world, how to manage risk along the chain?',
        ['logistics', 'eco']
      );
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

  async createUser(
    firstName: string,
    lastName: string,
    email: string,
    membersGroup: IUserGroup
  ): Promise<IUser> {
    const userInput = new UserInput();
    userInput.name = `${firstName} ${lastName}`;
    userInput.email = email;
    userInput.firstName = firstName;
    userInput.lastName = lastName;

    const user = await this.ecoverseService.createUserProfile(userInput);

    await this.userGroupService.addUserToGroup(user, membersGroup);

    return user;
  }

  async createChallenge(
    name: string,
    textID: string,
    tagline?: string,
    tags?: string[]
  ): Promise<IChallenge> {
    const challengeInput = new ChallengeInput();
    challengeInput.textID = textID;
    challengeInput.name = name;
    if (tagline) {
      challengeInput.context = {
        tagline,
      };
    }
    if (tags) {
      challengeInput.tags = tags;
    }

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
      this.logger.verbose?.(error.message, LogContext.DATA_MGMT);
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
      this.logger.verbose?.(e.message, LogContext.DATA_MGMT);
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
