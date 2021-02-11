import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { LogContext } from '@utils/logging/logging.contexts';
import { ActorGroupInput } from '@domain/actor-group/actor-group.dto';
import { IActorGroup } from '@domain/actor-group/actor-group.interface';
import { ActorGroupService } from '@domain/actor-group/actor-group.service';
import { AspectInput } from '@domain/aspect/aspect.dto';
import { IAspect } from '@domain/aspect/aspect.interface';
import { AspectService } from '@domain/aspect/aspect.service';
import { ProjectInput } from '@domain/project/project.dto';
import { IProject } from '@domain/project/project.interface';
import { ProjectService } from '@domain/project/project.service';
import { Context } from '@domain/context/context.entity';
import { ContextService } from '@domain/context/context.service';
import { RelationInput } from '@domain/relation/relation.dto';
import { IRelation } from '@domain/relation/relation.interface';
import { RelationService } from '@domain/relation/relation.service';
import { RestrictedGroupNames } from '@domain/user-group/user-group.entity';
import { IUserGroup } from '@domain/user-group/user-group.interface';
import { UserGroupService } from '@domain/user-group/user-group.service';
import { UserService } from '@domain/user/user.service';
import { OpportunityInput } from './opportunity.dto';
import { Opportunity } from './opportunity.entity';
import { IOpportunity } from './opportunity.interface';
import {
  EntityNotFoundException,
  GroupNotInitializedException,
  EntityNotInitializedException,
  ValidationException,
} from '@utils/error-handling/exceptions';
import { ApplicationInput } from '@domain/application/application.dto';
import { Application } from '@domain/application/application.entity';
import { ApplicationService } from '@domain/application/application.service';
import { ApplicationFactoryService } from '@domain/application/application.factory';
import { ApolloError } from 'apollo-server-express';

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
    private applicationService: ApplicationService,
    private applicationFactoryService: ApplicationFactoryService,
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

  async getOpportunityOrFail(
    opportunityID: number,
    options?: FindOneOptions<Opportunity>
  ): Promise<IOpportunity> {
    const opportunity = await this.opportunityRepository.findOne(
      { id: opportunityID },
      options
    );
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
    const opportunityLoaded = await this.getOpportunityOrFail(opportunity.id, {
      relations: ['actorGroups'],
    });
    if (!opportunityLoaded.actorGroups)
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
    const opportunityLoaded = await this.getOpportunityOrFail(opportunity.id, {
      relations: ['aspects'],
    });
    if (!opportunityLoaded.aspects)
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
    const opportunityLoaded = await this.getOpportunityOrFail(opportunity.id, {
      relations: ['relations'],
    });

    if (!opportunityLoaded.relations)
      throw new EntityNotInitializedException(
        `Opportunity not initialised: ${opportunity.id}`,
        LogContext.CHALLENGES
      );

    return opportunityLoaded.relations;
  }

  async createOpportunity(
    opportunityData: OpportunityInput
  ): Promise<IOpportunity> {
    await this.validateOpportunity(opportunityData);

    const textID = opportunityData.textID;
    opportunityData.textID = textID?.toLowerCase();

    // reate and initialise a new Opportunity using the first returned array item
    const opportunity = Opportunity.create(opportunityData);
    await this.initialiseMembers(opportunity);
    await this.opportunityRepository.save(opportunity);

    return opportunity;
  }

  async validateOpportunity(opportunityData: OpportunityInput) {
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
  }

  async updateOpportunity(
    opportunityID: number,
    opportunityData: OpportunityInput
  ): Promise<IOpportunity> {
    const opportunity = await this.getOpportunityOrFail(opportunityID);

    // Copy over the received data
    if (opportunityData.name) {
      opportunity.name = opportunityData.name;
    }

    if (opportunityData.state) {
      opportunity.state = opportunityData.state;
    }

    if (opportunityData.context && opportunity.context) {
      await this.contextService.update(
        opportunity.context,
        opportunityData.context
      );
    }

    await this.opportunityRepository.save(opportunity);

    return opportunity;
  }

  async removeOpportunity(opportunityID: number): Promise<boolean> {
    // Note need to load it in with all contained entities so can remove fully
    const opportunity = await this.getOpportunityOrFail(opportunityID, {
      relations: ['actorGroups', 'aspects', 'relations', 'groups'],
    });

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

    await this.opportunityRepository.remove(opportunity as Opportunity);
    return true;
  }

  async getChallengeID(opportunityID: number): Promise<number> {
    const opportunity = await this.getOpportunityOrFail(opportunityID, {
      relations: ['challenge'],
    });
    const challenge = (opportunity as Opportunity).challenge;
    if (!challenge)
      throw new ValidationException(
        `Opportunity with given ID is not in a challenge: ${opportunityID}`,
        LogContext.CHALLENGES
      );
    return challenge.id;
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

  async createProject(
    opportunityId: number,
    projectData: ProjectInput
  ): Promise<IProject> {
    this.logger.verbose?.(
      `Adding project to opportunity (${opportunityId})`,
      LogContext.CHALLENGES
    );

    const opportunity = await this.getOpportunityOrFail(opportunityId);

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
    opportunityID: number,
    aspectData: AspectInput
  ): Promise<IAspect> {
    const opportunity = await this.getOpportunityOrFail(opportunityID, {
      relations: ['aspects'],
    });
    if (!opportunity.aspects)
      throw new EntityNotInitializedException(
        `Opportunity (${opportunityID}) not initialised`,
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

    opportunity.aspects.push(aspect);
    await this.opportunityRepository.save(opportunity);
    return aspect;
  }

  async createActorGroup(
    opportunityId: number,
    actorGroupData: ActorGroupInput
  ): Promise<IActorGroup> {
    const opportunity = await this.getOpportunityOrFail(opportunityId, {
      relations: ['actorGroups'],
    });

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
    const opportunity = await this.getOpportunityOrFail(opportunityId, {
      relations: ['relations'],
    });

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

    // Try to find the Opportunity
    const opportunity = await this.getOpportunityOrFail(opportunityID, {
      relations: ['groups'],
    });

    const group = await this.userGroupService.addGroupWithName(
      opportunity,
      groupName
    );
    await this.opportunityRepository.save(opportunity);

    return group;
  }

  async addMember(userID: number, opportunityID: number): Promise<IUserGroup> {
    // Try to find the user + group
    const user = await this.userService.getUserByIdOrFail(userID);

    const opportunity = await this.getOpportunityOrFail(opportunityID);

    // Get the members group
    const membersGroup = await this.userGroupService.getGroupByName(
      opportunity,
      RestrictedGroupNames.Members
    );
    await this.userGroupService.addUserToGroup(user, membersGroup);

    return membersGroup;
  }

  async createApplication(
    id: number,
    applicationData: ApplicationInput
  ): Promise<Application> {
    const opportunity = (await this.getOpportunityOrFail(id, {
      relations: ['applications'],
    })) as Opportunity;

    const applications = await this.applicationService.getForOpportunityById(
      id
    );

    const existingApplication = applications.find(
      x => x.user.id === applicationData.userId
    );

    if (existingApplication) {
      throw new ApolloError(
        `An application for user ${
          existingApplication.user.email
        } already exits for opportunity: ${
          opportunity.name
        }. Application status: ${existingApplication.status.toString()}`
      );
    }

    const application = await this.applicationFactoryService.createApplication(
      applicationData
    );

    opportunity.applications?.push(application);
    await this.opportunityRepository.save(opportunity);
    return application;
  }
}
