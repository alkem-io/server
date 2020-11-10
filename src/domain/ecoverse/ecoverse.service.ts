import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IContext } from '../context/context.interface';
import { IOrganisation } from '../organisation/organisation.interface';
import { RestrictedGroupNames } from '../user-group/user-group.entity';
import { IUserGroup } from '../user-group/user-group.interface';
import { UserGroupService } from '../user-group/user-group.service';
import { FindOneOptions, Repository } from 'typeorm';
import { Ecoverse } from './ecoverse.entity';
import { IEcoverse } from './ecoverse.interface';
import { ContextService } from '../context/context.service';
import { EcoverseInput } from './ecoverse.dto';
import { TagsetService } from '../tagset/tagset.service';
import { IUser } from '../user/user.interface';
import { IChallenge } from '../challenge/challenge.interface';
import { ITagset } from '../tagset/tagset.interface';
import { ChallengeService } from '../challenge/challenge.service';
import { ChallengeInput } from '../challenge/challenge.dto';
import { UserInput } from '../user/user.dto';
import { OrganisationInput } from '../organisation/organisation.dto';
import { Organisation } from '../organisation/organisation.entity';
import { Context } from '../context/context.entity';
import { RestrictedTagsetNames, Tagset } from '../tagset/tagset.entity';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TemplateService } from '../template/template.service';
import { TemplateInput } from '../template/template.dto';
import { ITemplate } from '../template/template.interface';
import { OrganisationService } from '../organisation/organisation.service';
import { UserService } from '../user/user.service';
import { AccountService } from '../../utils/account/account.service';
import { LogContexts } from '../../utils/logging/logging.contexts';

@Injectable()
export class EcoverseService {
  constructor(
    private organisationService: OrganisationService,
    private userService: UserService,
    private challengeService: ChallengeService,
    private userGroupService: UserGroupService,
    private contextService: ContextService,
    private tagsetService: TagsetService,
    private accountService: AccountService,
    private templateService: TemplateService,
    @InjectRepository(Ecoverse)
    private ecoverseRepository: Repository<Ecoverse>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger
  ) {}

  // Helper method to ensure all members that are arrays are initialised properly.
  // Note: has to be a seprate call due to restrictions from ORM.
  async initialiseMembers(ecoverse: IEcoverse): Promise<IEcoverse> {
    if (!ecoverse.groups) {
      ecoverse.groups = [];
    }

    // Check that the mandatory groups for a challenge are created
    await this.userGroupService.addMandatoryGroups(
      ecoverse,
      ecoverse.restrictedGroupNames
    );
    // Disable searching on the mandatory platform groups
    ecoverse.groups.forEach(group => (group.includeInSearch = false));

    if (!ecoverse.challenges) {
      ecoverse.challenges = [];
    }

    if (!ecoverse.organisations) {
      ecoverse.organisations = [];
    }

    if (!ecoverse.tagset) {
      ecoverse.tagset = new Tagset(RestrictedTagsetNames.Default);
    }

    if (!ecoverse.context) {
      ecoverse.context = new Context();
    }

    // Initialise contained singletons
    await this.tagsetService.initialiseMembers(ecoverse.tagset);
    await this.contextService.initialiseMembers(ecoverse.context);

    if (!ecoverse.hostID || ecoverse.hostID == -1) {
      const orgInput = new OrganisationInput();
      orgInput.name = 'Default host organisation';
      const hostOrg = await this.organisationService.createOrganisation(
        orgInput
      );
      ecoverse.hostID = hostOrg.id;
    }

    return ecoverse;
  }

  async getEcoverse(options?: FindOneOptions<Ecoverse>): Promise<IEcoverse> {
    return await this.ecoverseRepository.findOneOrFail(options);
  }

  async getName(): Promise<string> {
    const ecoverse = await this.getEcoverse();
    return ecoverse.name;
  }

  async getEcoverseId(): Promise<number> {
    const ecoverse = await this.ecoverseRepository
      .createQueryBuilder('ecoverse')
      .select('ecoverse.id')
      .getOne(); // TODO [ATS] Replace with getOneOrFail when it is released. https://github.com/typeorm/typeorm/blob/06903d1c914e8082620dbf16551caa302862d328/src/query-builder/SelectQueryBuilder.ts#L1112

    if (!ecoverse) {
      throw new Error('Ecoverse is missing!');
    }
    return ecoverse.id;
  }

  async getUsers(): Promise<IUser[]> {
    try {
      const ecoverse = (await this.getEcoverse({
        relations: ['groups'],
      })) as IEcoverse;
      const membersGroup = await this.userGroupService.getGroupByName(
        ecoverse,
        RestrictedGroupNames.Members
      );

      return await this.userGroupService.getMembers(membersGroup.id);
    } catch (e) {
      throw e;
    }
  }

  async getGroups(): Promise<IUserGroup[]> {
    try {
      const ecoverse = await this.getEcoverse();
      const groups = await this.userGroupService.getGroups(ecoverse);
      return groups;
    } catch (e) {
      throw e;
    }
  }

  async getGroupsWithTag(tagFilter: string): Promise<IUserGroup[]> {
    const groups = await this.getGroups();
    return groups.filter(g => {
      if (!tagFilter) {
        return true;
      }

      if (!g.profile) return false;

      const tagset = this.tagsetService.defaultTagset(g.profile);

      return (
        tagset !== undefined && this.tagsetService.hasTag(tagset, tagFilter)
      );
    });
  }

  async getChallenges(): Promise<IChallenge[]> {
    const ecoverseId = await this.getEcoverseId();
    const challanges = await this.challengeService.getChallenges(ecoverseId);
    return challanges;
  }

  async getTemplates(): Promise<ITemplate[]> {
    const ecoverseId = await this.getEcoverseId();
    const templates = await this.templateService.getTemplates(ecoverseId);
    return templates;
  }

  async getOrganisations(): Promise<IOrganisation[]> {
    const ecoverseId = await this.getEcoverseId();
    return await this.organisationService.getOrganisations(ecoverseId);
  }

  async getContext(): Promise<IContext> {
    const ecoverse = (await this.getEcoverse()) as IEcoverse;
    return ecoverse.context as IContext;
  }

  async getTagset(): Promise<ITagset> {
    const ecoverse: IEcoverse = await this.getEcoverse();
    return ecoverse.tagset as ITagset;
  }

  async getHost(): Promise<IOrganisation> {
    const ecoverse = await this.getEcoverse();
    if (!ecoverse.hostID) throw new Error('Unable to locate host organisation');
    return this.organisationService.getOrganisationByID(ecoverse.hostID);
  }

  async createGroup(groupName: string): Promise<IUserGroup> {
    this.logger.verbose(
      `Adding userGroup (${groupName}) to ecoverse`,
      LogContexts.CHALLENGES
    );

    const ecoverse = (await this.getEcoverse({
      join: {
        alias: 'ecoverse',
        leftJoinAndSelect: {
          groups: 'ecoverse.groups',
        },
      },
    })) as Ecoverse;

    const group = await this.userGroupService.addGroupWithName(
      ecoverse,
      groupName
    );

    await this.ecoverseRepository.save(ecoverse);

    return group;
  }

  async createChallenge(challengeData: ChallengeInput): Promise<IChallenge> {
    const ecoverse = await this.getEcoverse({
      join: {
        alias: 'ecoverse',
        leftJoinAndSelect: {
          challenges: 'ecoverse.challenges',
        },
      },
    });

    if (!ecoverse.challenges) {
      throw new Error('Challenges must be defined');
    }
    // First check if the challenge already exists on not...
    let challenge = ecoverse.challenges.find(
      c => c.name === challengeData.name
    );
    if (challenge) {
      // already have a challenge with the given name, not allowed
      throw new Error(
        `Unable to create challenge: already have a challenge with the provided name (${challengeData.name})`
      );
    }
    // No existing challenge found, create and initialise a new one!
    challenge = await this.challengeService.createChallenge(challengeData);

    ecoverse.challenges.push(challenge);
    await this.ecoverseRepository.save(ecoverse);

    return challenge;
  }

  async createTemplate(templateData: TemplateInput): Promise<ITemplate> {
    const ecoverse = await this.getEcoverse({
      join: {
        alias: 'ecoverse',
        leftJoinAndSelect: {
          challenges: 'ecoverse.templates',
        },
      },
    });

    if (!ecoverse.templates) {
      throw new Error('Templates must be defined');
    }
    // First check if the challenge already exists on not...
    let template = ecoverse.templates.find(c => c.name === templateData.name);
    if (template)
      throw new Error(
        `Template with the provided name already exists: ${templateData.name}`
      );
    // No existing challenge found, create and initialise a new one!
    template = await this.templateService.createTemplate(templateData);

    ecoverse.templates.push(template);
    await this.ecoverseRepository.save(ecoverse);

    return template;
  }

  async createOrganisation(
    organisationData: OrganisationInput
  ): Promise<IOrganisation> {
    const ecoverse = await this.getEcoverse({
      join: {
        alias: 'ecoverse',
        leftJoinAndSelect: {
          organisations: 'ecoverse.organisations',
        },
      },
    });
    if (!ecoverse.organisations) {
      throw new Error('Organisations must be defined');
    }

    let organisation = ecoverse.organisations.find(
      o => o.name === organisationData.name
    );
    // First check if the organisation already exists on not...
    if (organisation)
      throw new Error(
        `Organisation with the provided name already exists: ${organisationData.name}`
      );

    // No existing organisation found, create and initialise a new one!
    organisation = await this.organisationService.createOrganisation(
      organisationData
    );
    ecoverse.organisations.push(organisation as Organisation);
    await this.ecoverseRepository.save(ecoverse);

    return organisation;
  }

  // Create the user and an account on the identity provider
  async createUser(userData: UserInput): Promise<IUser> {
    // Check that a valid profile and a valid account can be created. It is double work but not easily avoided.
    await this.userService.validateUserProfileCreationRequest(userData);
    if (this.accountService.authenticationEnabled()) {
      await this.accountService.validateAccountCreationRequest(userData);
    }

    // Ok to proceed to creating profile and optionally account
    const user = await this.createUserProfile(userData);
    if (this.accountService.authenticationEnabled()) {
      try {
        const result = await this.accountService.createUserAccount(userData);
        if (!result) throw new Error('Unable to create account for user!');
      } catch (e) {
        // Account creation failed; need to remove the user
        await this.userService.removeUser(user);
        throw new Error(
          `Unable to create account for user. Removing created user profile: ${user.name}.  ${e}`
        );
      }
    }
    return user;
  }

  // Create the user and add the user into the members group
  async createUserProfile(userData: UserInput): Promise<IUser> {
    const ctUser = await this.userService.createUser(userData);
    if (!ctUser)
      throw new Error(`User ${userData.email} could not be created!`);

    const ecoverse = await this.getEcoverse({
      relations: ['groups'],
    });
    // Also add the user into the members group
    const membersGroup = await this.userGroupService.getGroupByName(
      ecoverse,
      RestrictedGroupNames.Members
    );
    await this.userGroupService.addUserToGroup(ctUser, membersGroup);

    return ctUser;
  }

  async addAdmin(user: IUser): Promise<boolean> {
    return await this.addUserToRestrictedGroup(
      user,
      RestrictedGroupNames.EcoverseAdmins
    );
  }

  async addGlobalAdmin(user: IUser): Promise<boolean> {
    return await this.addUserToRestrictedGroup(
      user,
      RestrictedGroupNames.GlobalAdmins
    );
  }

  async addCommunityAdmin(user: IUser): Promise<boolean> {
    return await this.addUserToRestrictedGroup(
      user,
      RestrictedGroupNames.CommunityAdmins
    );
  }

  async addUserToRestrictedGroup(
    user: IUser,
    groupName: string
  ): Promise<boolean> {
    if (!(await this.groupIsRestricted(groupName)))
      throw new Error(`${groupName} is not a restricted group name!`);

    const ctverse = await this.getEcoverse({ relations: ['groups'] });
    const adminsGroup = await this.userGroupService.getGroupByName(
      ctverse,
      groupName
    );

    if (await this.userGroupService.addUserToGroup(user, adminsGroup)) {
      return true;
    }

    return false;
  }

  async groupIsRestricted(groupName: string): Promise<boolean> {
    if (
      [
        RestrictedGroupNames.EcoverseAdmins as string,
        RestrictedGroupNames.CommunityAdmins as string,
        RestrictedGroupNames.GlobalAdmins as string,
        RestrictedGroupNames.Members as string,
      ].includes(groupName)
    )
      return true;
    return false;
  }

  // Removes the user and deletes the profile
  async removeUser(userID: number): Promise<boolean> {
    const user = await this.userService.getUserByID(userID);
    if (!user) throw new Error(`Could not locate specified user: ${userID}`);

    const groups = await this.getGroups();
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      await this.userGroupService.removeUserFromGroup(user, group);
    }

    // And finally remove the user
    await this.userService.removeUser(user);

    return true;
  }

  async update(ecoverseData: EcoverseInput): Promise<IEcoverse> {
    const ecoverse = await this.getEcoverse();

    // Copy over the received data
    if (ecoverseData.name) {
      ecoverse.name = ecoverseData.name;
    }

    if (ecoverseData.context) {
      if (!ecoverse.context) {
        ecoverse.context = new Context();
      }
      await this.contextService.update(ecoverse.context, ecoverseData.context);
    }

    if (ecoverseData.tags) {
      if (!ecoverse.tagset) {
        ecoverse.tagset = new Tagset(RestrictedTagsetNames.Default);
      }
      await this.tagsetService.replaceTags(
        ecoverse.tagset.id,
        ecoverseData.tags
      );
    }

    await this.ecoverseRepository.save(ecoverse);

    return ecoverse;
  }
}
