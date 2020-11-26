import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { LogContexts } from '../../utils/logging/logging.contexts';
import { ActorGroupInput } from '../actor-group/actor-group.dto';
import { RestrictedActorGroupNames } from '../actor-group/actor-group.entity';
import { IActorGroup } from '../actor-group/actor-group.interface';
import { ActorGroupService } from '../actor-group/actor-group.service';
import { AspectInput } from '../aspect/aspect.dto';
import { IAspect } from '../aspect/aspect.interface';
import { AspectService } from '../aspect/aspect.service';
import { ProfileService } from '../profile/profile.service';
import { ProjectInput } from '../project/project.dto';
import { IProject } from '../project/project.interface';
import { ProjectService } from '../project/project.service';
import { Context } from '../context/context.entity';
import { ContextService } from '../context/context.service';
import { RelationInput } from '../relation/relation.dto';
import { IRelation } from '../relation/relation.interface';
import { RelationService } from '../relation/relation.service';
import { RestrictedGroupNames } from '../user-group/user-group.entity';
import { IUserGroup } from '../user-group/user-group.interface';
import { UserGroupService } from '../user-group/user-group.service';
import { UserService } from '../user/user.service';
import { OpportunityInput } from './opportunity.dto';
import { Opportunity } from './opportunity.entity';
import { IOpportunity } from './opportunity.interface';

@Injectable()
export class OpportunityService {
  constructor(
    private actorGroupService: ActorGroupService,
    private userGroupService: UserGroupService,
    private userService: UserService,
    private aspectService: AspectService,
    private profileService: ProfileService,
    private projectService: ProjectService,
    private contextService: ContextService,
    private relationService: RelationService,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger
  ) {}

  async initialiseMembers(opportunity: IOpportunity): Promise<IOpportunity> {
    if (!opportunity.projects) {
      opportunity.projects = [];
    }

    if (!opportunity.relations) {
      opportunity.relations = [];
    }

    if (!opportunity.actorGroups) {
      opportunity.actorGroups = [];
    }

    if (!opportunity.aspects) {
      opportunity.aspects = [];
    }

    if (!opportunity.groups) {
      opportunity.groups = [];
    }

    if (!opportunity.context) {
      opportunity.context = new Context();
    }

    // Check that the mandatory groups for a Opportunity are created
    await this.userGroupService.addMandatoryGroups(
      opportunity,
      opportunity.restrictedGroupNames
    );

    // Initialise contained objects
    await this.contextService.initialiseMembers(opportunity.context);
    await this.createRestrictedActorGroups(opportunity);

    return opportunity;
  }

  async getOpportunityByID(opportunityID: number): Promise<IOpportunity> {
    const opportunity = await this.opportunityRepository.findOne({
      where: { id: opportunityID },
    });
    if (!opportunity)
      throw new Error(`Unable to find Opportunity with ID: ${opportunityID}`);
    return opportunity;
  }

  async getOpportunityByIdWithAspects(
    opportunityID: number
  ): Promise<IOpportunity> {
    const opportunity = await this.opportunityRepository.findOne({
      where: { id: opportunityID },
      relations: ['aspects'],
    });
    if (!opportunity)
      throw new Error(`Unable to find Opportunity with ID: ${opportunityID}`);
    return opportunity;
  }

  async getOpportunityByIdWithActorGroups(
    opportunityID: number
  ): Promise<IOpportunity> {
    const opportunity = await this.opportunityRepository.findOne({
      where: { id: opportunityID },
      relations: ['actorGroups'],
    });
    if (!opportunity)
      throw new Error(`Unable to find Opportunity with ID: ${opportunityID}`);
    return opportunity;
  }

  async getOpportunityByIdWithRelations(
    opportunityID: number
  ): Promise<IOpportunity> {
    const opportunity = await this.opportunityRepository.findOne({
      where: { id: opportunityID },
      relations: ['relations'],
    });
    if (!opportunity)
      throw new Error(`Unable to find Opportunity with ID: ${opportunityID}`);
    return opportunity;
  }

  async getOpportunites(): Promise<Opportunity[]> {
    const opportunites = await this.opportunityRepository.find();
    return opportunites || [];
  }

  // Loads the group into the Opportunity entity if not already present
  async loadUserGroups(opportunity: Opportunity): Promise<IUserGroup[]> {
    if (opportunity.groups && opportunity.groups.length > 0) {
      // opportunity already has groups loaded
      return opportunity.groups;
    }
    // Opportunity is not populated wih
    const groups = await this.userGroupService.getGroups(opportunity);
    if (!groups)
      throw new Error(`No groups on Opportunity: ${opportunity.name}`);
    return groups;
  }

  // Loads the actorGroups into the Opportunity entity if not already present
  async loadActorGroups(opportunity: Opportunity): Promise<IActorGroup[]> {
    if (opportunity.actorGroups && opportunity.actorGroups.length > 0) {
      // opportunity already has actor groups loaded
      return opportunity.actorGroups;
    }
    // Opportunity is not populated so load it with actorGroups
    const opportunityLoaded = await this.getOpportunityByIdWithActorGroups(
      opportunity.id
    );
    if (!opportunityLoaded || !opportunityLoaded.actorGroups)
      throw new Error(`Opportunity not initialised: ${opportunity.id}`);

    return opportunityLoaded.actorGroups;
  }

  // Loads the aspects into the Opportunity entity if not already present
  async loadAspects(opportunity: Opportunity): Promise<IAspect[]> {
    if (opportunity.aspects && opportunity.aspects.length > 0) {
      // opportunity already has actor groups loaded
      return opportunity.aspects;
    }
    // Opportunity is not populated so load it with actorGroups
    const opportunityLoaded = await this.getOpportunityByIdWithAspects(
      opportunity.id
    );
    if (!opportunityLoaded || !opportunityLoaded.aspects)
      throw new Error(`Opportunity not initialised: ${opportunity.id}`);

    return opportunityLoaded.aspects;
  }

  // Loads the aspects into the Opportunity entity if not already present
  async loadRelations(opportunity: Opportunity): Promise<IRelation[]> {
    if (opportunity.relations && opportunity.relations.length > 0) {
      // opportunity already has relations loaded
      return opportunity.relations;
    }
    // Opportunity is not populated so load it with actorGroups
    const opportunityLoaded = await this.getOpportunityByIdWithRelations(
      opportunity.id
    );
    if (!opportunityLoaded || !opportunityLoaded.relations)
      throw new Error(`Opportunity not initialised: ${opportunity.id}`);

    return opportunityLoaded.relations;
  }

  async createOpportunity(
    opportunityData: OpportunityInput
  ): Promise<IOpportunity> {
    // Verify that required textID field is present and that it has the right format
    const textID = opportunityData.textID;
    if (!textID || textID.length < 3)
      throw new Error(
        `Required field textID not specified or long enough: ${textID}`
      );
    const expression = /^[a-zA-Z0-9.\-_]+$/;
    const textIdCheck = expression.test(textID);
    if (!textIdCheck)
      throw new Error(
        `Required field textID provided not in the correct format: ${textID}`
      ); // Ensure field is lower case
    opportunityData.textID = textID.toLowerCase();

    // reate and initialise a new Opportunity using the first returned array item
    const opportunity = Opportunity.create(opportunityData);
    await this.initialiseMembers(opportunity);
    await this.opportunityRepository.save(opportunity);

    return opportunity;
  }

  async updateOpportunity(
    opportunityID: number,
    opportunityData: OpportunityInput
  ): Promise<IOpportunity> {
    const Opportunity = await this.getOpportunityByID(opportunityID);

    // Copy over the received data
    if (opportunityData.name) {
      Opportunity.name = opportunityData.name;
    }

    if (opportunityData.state) {
      Opportunity.state = opportunityData.state;
    }

    await this.opportunityRepository.save(Opportunity);

    return Opportunity;
  }

  async removeOpportunity(opportunityID: number): Promise<boolean> {
    // Note need to load it in with all contained entities so can remove fully
    const opportunity = await this.opportunityRepository.findOne({
      where: { id: opportunityID },
      relations: ['actorGroups', 'aspects', 'relations', 'groups'],
    });
    if (!opportunity)
      throw new Error(
        `Not able to locate Opportunity with the specified ID: ${opportunityID}`
      );

    // First remove all groups
    if (opportunity.groups) {
      for (let i = 0; i < opportunity.groups.length; i++) {
        const group = opportunity.groups[i];
        await this.userGroupService.removeUserGroup(group.id);
      }
    }

    if (opportunity.aspects) {
      for (let i = 0; i < opportunity.aspects.length; i++) {
        const aspect = opportunity.aspects[i];
        await this.aspectService.removeAspect(aspect.id);
      }
    }

    if (opportunity.relations) {
      for (let i = 0; i < opportunity.relations.length; i++) {
        const relation = opportunity.relations[i];
        await this.relationService.removeRelation(relation.id);
      }
    }

    if (opportunity.actorGroups) {
      for (let i = 0; i < opportunity.actorGroups.length; i++) {
        const actorGroup = opportunity.actorGroups[i];
        await this.actorGroupService.removeActorGroup(actorGroup.id);
      }
    }

    await this.opportunityRepository.remove(opportunity);
    return true;
  }

  async getChallengeID(opportunityID: number): Promise<number> {
    const opportunity = await this.opportunityRepository.findOne({
      where: { id: opportunityID },
      relations: ['challenge'],
    });
    if (!opportunity)
      throw new Error(
        `Unable to locate opportunity with the given ID: ${opportunityID}`
      );
    if (!opportunity.challenge)
      throw new Error(
        `Opportunity with given ID is not in a challenge: ${opportunityID}`
      );
    return opportunity.challenge.id;
  }

  async createRestrictedActorGroups(
    opportunity: IOpportunity
  ): Promise<boolean> {
    if (!opportunity.restrictedActorGroupNames) {
      throw new Error('Non-initialised Opportunity submitted');
    }
    for (const name of opportunity.restrictedActorGroupNames) {
      const actorGroupData = new ActorGroupInput();
      actorGroupData.name = name;
      actorGroupData.description = 'Default actor group';
      const actorGroup = await this.actorGroupService.createActorGroup(
        actorGroupData
      );
      opportunity.actorGroups?.push(actorGroup);
      await this.opportunityRepository.save(opportunity);
    }
    return true;
  }

  // Get the default ActorGroup
  getCollaboratorsActorGroup(
    opportunity: IOpportunity
  ): IActorGroup | undefined {
    if (!opportunity.actorGroups)
      throw new Error('actorGroups not initialised');
    const collaboratorsActorGroup = opportunity.actorGroups.find(
      t => t.name === RestrictedActorGroupNames.Collaborators
    );
    return collaboratorsActorGroup;
  }

  async createProject(
    opportunityId: number,
    projectData: ProjectInput
  ): Promise<IProject> {
    this.logger.verbose(
      `Adding project to opportunity (${opportunityId})`,
      LogContexts.CHALLENGES
    );

    const opportunity = await this.getOpportunityByID(opportunityId);
    if (!opportunity)
      throw new Error(`Unalbe to locate opportunity with id: ${opportunityId}`);

    // Check that do not already have an Project with the same name
    const name = projectData.name;
    const textID = projectData.textID.toLowerCase();
    const existingProject = opportunity.projects?.find(
      project => project.name === name || project.textID === textID
    );
    if (existingProject)
      throw new Error(
        `Already have an Project with the provided name or textID: ${name} - ${projectData.textID}`
      );

    const project = await this.projectService.createProject(projectData);
    if (!opportunity.projects)
      throw new Error(`Opportunity (${opportunityId}) not initialised`);
    opportunity.projects.push(project);
    await this.opportunityRepository.save(opportunity);
    return project;
  }

  async createAspect(
    opportunityId: number,
    aspectData: AspectInput
  ): Promise<IAspect> {
    const opportunity = await this.getOpportunityByIdWithAspects(opportunityId);
    if (!opportunity)
      throw new Error(`Unable to locate opportunity with id: ${opportunityId}`);

    // Check that do not already have an aspect with the same title
    const title = aspectData.title;
    const existingAspect = opportunity.aspects?.find(
      aspect => aspect.title === title
    );
    if (existingAspect)
      throw new Error(
        `Already have an aspect with the provided title: ${title}`
      );

    const aspect = await this.aspectService.createAspect(aspectData);
    if (!opportunity.aspects)
      throw new Error(`Opportunity (${opportunityId}) not initialised`);
    opportunity.aspects.push(aspect);
    await this.opportunityRepository.save(opportunity);
    return aspect;
  }

  async createActorGroup(
    opportunityId: number,
    actorGroupData: ActorGroupInput
  ): Promise<IActorGroup> {
    const opportunity = await this.getOpportunityByIdWithActorGroups(
      opportunityId
    );
    if (!opportunity)
      throw new Error(`Unalbe to locate opportunity with id: ${opportunityId}`);

    // Check that do not already have an aspect with the same title
    const name = actorGroupData.name;
    const existingActorGroup = opportunity.actorGroups?.find(
      actorGroup => actorGroup.name === name
    );
    if (existingActorGroup)
      throw new Error(
        `Already have an actor group with the provided name: ${name}`
      );

    const actorGroup = await this.actorGroupService.createActorGroup(
      actorGroupData
    );
    if (!opportunity.actorGroups)
      throw new Error(`Opportunity (${opportunityId}) not initialised`);
    opportunity.actorGroups.push(actorGroup);
    await this.opportunityRepository.save(opportunity);
    return actorGroup;
  }

  async createRelation(
    opportunityId: number,
    relationData: RelationInput
  ): Promise<IRelation> {
    const opportunity = await this.getOpportunityByIdWithRelations(
      opportunityId
    );
    if (!opportunity)
      throw new Error(`Unalbe to locate opportunity with id: ${opportunityId}`);
    if (!opportunity.relations)
      throw new Error(`Opportunity (${opportunityId}) not initialised`);

    const relation = await this.relationService.createRelation(relationData);
    opportunity.relations.push(relation);
    await this.opportunityRepository.save(opportunity);
    return relation;
  }

  async createUserGroup(
    opportunityID: number,
    groupName: string
  ): Promise<IUserGroup> {
    // First find the Opportunity
    this.logger.verbose(
      `Adding userGroup (${groupName}) to Opportunity (${opportunityID})`,
      LogContexts.CHALLENGES
    );
    // Check a valid ID was passed
    if (!opportunityID)
      throw new Error(`Invalid Opportunity id passed in: ${opportunityID}`);
    // Try to find the Opportunity
    const opportunity = await this.opportunityRepository.findOne({
      where: { id: opportunityID },
      relations: ['groups'],
    });
    if (!opportunity) {
      throw new Error(
        `Unable to create the group: no opportunity with ID: ${opportunityID}`
      );
    }
    const group = await this.userGroupService.addGroupWithName(
      opportunity,
      groupName
    );
    await this.opportunityRepository.save(opportunity);

    return group;
  }

  async addMember(userID: number, opportunityID: number): Promise<IUserGroup> {
    // Try to find the user + group
    const user = await this.userService.getUserByID(userID);
    if (!user) {
      const msg = `Unable to find exactly one user with ID: ${userID}`;
      this.logger.warn(msg, LogContexts.CHALLENGES);
      throw new Error(msg);
    }

    const opportunity = await this.getOpportunityByID(opportunityID);

    // Get the members group
    const membersGroup = await this.userGroupService.getGroupByName(
      opportunity,
      RestrictedGroupNames.Members
    );
    await this.userGroupService.addUserToGroup(user, membersGroup);

    return membersGroup;
  }
}
