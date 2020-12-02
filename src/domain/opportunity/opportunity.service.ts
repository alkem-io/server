import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { LogContext } from '../../utils/logging/logging.contexts';
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
import { EntityNotFoundException } from '../../utils/error-handling/exceptions/entity.not.found.exception';
import { GroupNotInitializedException } from '../../utils/error-handling/exceptions/group.not.initialized.exception';
import { EntityNotInitializedException } from '../../utils/error-handling/exceptions/entity.not.initialized.exception';
import { ValidationException } from '../../utils/error-handling/exceptions/validation.exception';
import { Reference } from '../reference/reference.entity';

@Injectable()
export class OpportunityService {
  constructor(
    private actorGroupService: ActorGroupService,
    private userGroupService: UserGroupService,
    private userService: UserService,
    private aspectService: AspectService,
    private projectService: ProjectService,
    private contextService: ContextService,
    private relationService: RelationService,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
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
      throw new EntityNotFoundException(
        `Unable to find Opportunity with ID: ${opportunityID}`,
        LogContext.CHALLENGES
      );
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
      throw new EntityNotFoundException(
        `Unable to find Opportunity with ID: ${opportunityID}`,
        LogContext.CHALLENGES
      );
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
      throw new EntityNotFoundException(
        `Unable to find Opportunity with ID: ${opportunityID}`,
        LogContext.CHALLENGES
      );
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
      throw new EntityNotFoundException(
        `Unable to find Opportunity with ID: ${opportunityID}`,
        LogContext.CHALLENGES
      );
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
      throw new GroupNotInitializedException(
        `No groups on Opportunity: ${opportunity.name}`,
        LogContext.CHALLENGES
      );
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
      throw new EntityNotInitializedException(
        `Opportunity not initialised: ${opportunity.id}`,
        LogContext.CHALLENGES
      );

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
      throw new EntityNotFoundException(
        `Opportunity not initialised: ${opportunity.id}`,
        LogContext.CHALLENGES
      );

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
      throw new EntityNotInitializedException(
        `Opportunity not initialised: ${opportunity.id}`,
        LogContext.CHALLENGES
      );

    return opportunityLoaded.relations;
  }

  async createOpportunity(
    opportunityData: OpportunityInput
  ): Promise<IOpportunity> {
    // Verify that required textID field is present and that it has the right format
    const textID = opportunityData.textID;
    if (!textID || textID.length < 3)
      throw new ValidationException(
        `Required field textID not specified or long enough: ${textID}`,
        LogContext.CHALLENGES
      );
    const expression = /^[a-zA-Z0-9.\-_]+$/;
    const textIdCheck = expression.test(textID);
    if (!textIdCheck)
      throw new ValidationException(
        `Required field textID provided not in the correct format: ${textID}`,
        LogContext.CHALLENGES
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
    const opportunity = await this.getOpportunityByID(opportunityID);

    // Copy over the received data
    if (opportunityData.name) {
      opportunity.name = opportunityData.name;
    }

    if (opportunityData.state) {
      opportunity.state = opportunityData.state;
    }

    if (opportunityData.context && opportunity.context) {
      this.contextService.update(opportunity.context, opportunityData.context);
    }

    await this.opportunityRepository.save(opportunity);

    return opportunity;
  }

  async removeOpportunity(opportunityID: number): Promise<boolean> {
    // Note need to load it in with all contained entities so can remove fully
    const opportunity = await this.opportunityRepository.findOne({
      where: { id: opportunityID },
      relations: ['actorGroups', 'aspects', 'relations', 'groups'],
    });
    if (!opportunity)
      throw new EntityNotFoundException(
        `Not able to locate Opportunity with the specified ID: ${opportunityID}`,
        LogContext.CHALLENGES
      );

    // First remove all groups
    if (opportunity.groups) {
      for (const group of opportunity.groups) {
        await this.userGroupService.removeUserGroup(group.id);
      }
    }

    if (opportunity.aspects) {
      for (const aspect of opportunity.aspects) {
        await this.aspectService.removeAspect(aspect.id);
      }
    }

    if (opportunity.relations) {
      for (const relation of opportunity.relations) {
        await this.relationService.removeRelation(relation.id);
      }
    }

    if (opportunity.actorGroups) {
      for (const actorGroup of opportunity.actorGroups) {
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
      throw new EntityNotFoundException(
        `Unable to locate opportunity with the given ID: ${opportunityID}`,
        LogContext.CHALLENGES
      );
    if (!opportunity.challenge)
      throw new ValidationException(
        `Opportunity with given ID is not in a challenge: ${opportunityID}`,
        LogContext.CHALLENGES
      );
    return opportunity.challenge.id;
  }

  async createRestrictedActorGroups(
    opportunity: IOpportunity
  ): Promise<boolean> {
    if (!opportunity.restrictedActorGroupNames) {
      throw new EntityNotInitializedException(
        'Non-initialised Opportunity submitted',
        LogContext.CHALLENGES
      );
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
      throw new EntityNotInitializedException(
        'actorGroups not initialised',
        LogContext.CHALLENGES
      );
    const collaboratorsActorGroup = opportunity.actorGroups.find(
      t => t.name === RestrictedActorGroupNames.Collaborators
    );
    return collaboratorsActorGroup;
  }

  async createProject(
    opportunityId: number,
    projectData: ProjectInput
  ): Promise<IProject> {
    this.logger.verbose?.(
      `Adding project to opportunity (${opportunityId})`,
      LogContext.CHALLENGES
    );

    const opportunity = await this.getOpportunityByID(opportunityId);
    if (!opportunity)
      throw new EntityNotFoundException(
        `Unalbe to locate opportunity with id: ${opportunityId}`,
        LogContext.CHALLENGES
      );

    // Check that do not already have an Project with the same name
    const name = projectData.name;
    const textID = projectData.textID.toLowerCase();
    const existingProject = opportunity.projects?.find(
      project => project.name === name || project.textID === textID
    );
    if (existingProject)
      throw new ValidationException(
        `Already have an Project with the provided name or textID: ${name} - ${projectData.textID}`,
        LogContext.CHALLENGES
      );

    const project = await this.projectService.createProject(projectData);
    if (!opportunity.projects)
      throw new EntityNotInitializedException(
        `Opportunity (${opportunityId}) not initialised`,
        LogContext.CHALLENGES
      );
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
      throw new EntityNotFoundException(
        `Unable to locate opportunity with id: ${opportunityId}`,
        LogContext.CHALLENGES
      );

    // Check that do not already have an aspect with the same title
    const title = aspectData.title;
    const existingAspect = opportunity.aspects?.find(
      aspect => aspect.title === title
    );
    if (existingAspect)
      throw new ValidationException(
        `Already have an aspect with the provided title: ${title}`,
        LogContext.CHALLENGES
      );

    const aspect = await this.aspectService.createAspect(aspectData);
    if (!opportunity.aspects)
      throw new EntityNotInitializedException(
        `Opportunity (${opportunityId}) not initialised`,
        LogContext.CHALLENGES
      );
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
      throw new EntityNotFoundException(
        `Unalbe to locate opportunity with id: ${opportunityId}`,
        LogContext.CHALLENGES
      );

    // Check that do not already have an aspect with the same title
    const name = actorGroupData.name;
    const existingActorGroup = opportunity.actorGroups?.find(
      actorGroup => actorGroup.name === name
    );
    if (existingActorGroup)
      throw new ValidationException(
        `Already have an actor group with the provided name: ${name}`,
        LogContext.CHALLENGES
      );

    const actorGroup = await this.actorGroupService.createActorGroup(
      actorGroupData
    );
    if (!opportunity.actorGroups)
      throw new EntityNotInitializedException(
        `Opportunity (${opportunityId}) not initialised`,
        LogContext.CHALLENGES
      );
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
      throw new EntityNotFoundException(
        `Unalbe to locate opportunity with id: ${opportunityId}`,
        LogContext.CHALLENGES
      );
    if (!opportunity.relations)
      throw new EntityNotInitializedException(
        `Opportunity (${opportunityId}) not initialised`,
        LogContext.CHALLENGES
      );

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
    this.logger.verbose?.(
      `Adding userGroup (${groupName}) to Opportunity (${opportunityID})`,
      LogContext.CHALLENGES
    );
    // Check a valid ID was passed
    if (!opportunityID)
      throw new ValidationException(
        `Invalid Opportunity id passed in: ${opportunityID}`,
        LogContext.CHALLENGES
      );
    // Try to find the Opportunity
    const opportunity = await this.opportunityRepository.findOne({
      where: { id: opportunityID },
      relations: ['groups'],
    });
    if (!opportunity) {
      throw new EntityNotFoundException(
        `Unable to create the group: no opportunity with ID: ${opportunityID}`,
        LogContext.CHALLENGES
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
      throw new ValidationException(
        `Unable to find exactly one user with ID: ${userID}`,
        LogContext.CHALLENGES
      );
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
