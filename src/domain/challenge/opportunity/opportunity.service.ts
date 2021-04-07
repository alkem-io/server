import { CreateActorGroupInput } from '@domain/context/actor-group';
import { IActorGroup } from '@domain/context/actor-group/actor-group.interface';
import { ActorGroupService } from '@domain/context/actor-group/actor-group.service';
import { CreateAspectInput } from '@domain/context/aspect';
import { IAspect } from '@domain/context/aspect/aspect.interface';
import { AspectService } from '@domain/context/aspect/aspect.service';
import { Context } from '@domain/context/context/context.entity';
import { ContextService } from '@domain/context/context/context.service';
import { CreateProjectInput } from '@domain/collaboration/project';
import { IProject } from '@domain/collaboration/project/project.interface';
import { ProjectService } from '@domain/collaboration/project/project.service';
import { CreateRelationInput } from '@domain/collaboration/relation';
import { IRelation } from '@domain/collaboration/relation/relation.interface';
import { RelationService } from '@domain/collaboration/relation/relation.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { CreateOpportunityInput } from './opportunity.dto.create';
import { Opportunity } from './opportunity.entity';
import { IOpportunity } from './opportunity.interface';
import { Community, ICommunity } from '@domain/community/community';
import { CommunityService } from '@domain/community/community/community.service';
import { AuthorizationRoles } from '@core/authorization';
import { CommunityType } from '@common/enums/community.types';
import { TagsetService } from '@domain/common/tagset';
import validator from 'validator';
import { UpdateOpportunityInput } from './opportunity.dto.update';
@Injectable()
export class OpportunityService {
  constructor(
    private actorGroupService: ActorGroupService,
    private aspectService: AspectService,
    private projectService: ProjectService,
    private contextService: ContextService,
    private communityService: CommunityService,
    private tagsetService: TagsetService,
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

    if (!opportunity.context) {
      opportunity.context = new Context();
    }

    if (!opportunity.community) {
      opportunity.community = new Community(
        opportunity.name,
        CommunityType.OPPORTUNITY,
        [AuthorizationRoles.Members]
      );
    }

    // Initialise contained objects
    await this.contextService.initialiseMembers(opportunity.context);
    await this.communityService.initialiseMembers(opportunity.community);
    await this.createRestrictedActorGroups(opportunity);

    return opportunity;
  }

  async getOpportunityOrFail(
    opportunityID: string,
    options?: FindOneOptions<Opportunity>
  ): Promise<IOpportunity> {
    if (validator.isNumeric(opportunityID)) {
      const idInt: number = parseInt(opportunityID);
      return await this.getOpportunityByIdOrFail(idInt, options);
    }

    return await this.getOpportunityByTextIdOrFail(opportunityID, options);
  }

  async getOpportunityByTextIdOrFail(
    opportunityID: string,
    options?: FindOneOptions<Opportunity>
  ): Promise<IOpportunity> {
    const opportunity = await this.opportunityRepository.findOne(
      { textID: opportunityID },
      options
    );
    if (!opportunity)
      throw new EntityNotFoundException(
        `Unable to find opportunity with ID: ${opportunityID}`,
        LogContext.CHALLENGES
      );
    return opportunity;
  }

  async getOpportunityByIdOrFail(
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

  // Loads the actorGroups into the Opportunity entity if not already present
  async loadActorGroups(opportunity: Opportunity): Promise<IActorGroup[]> {
    if (opportunity.actorGroups && opportunity.actorGroups.length > 0) {
      // opportunity already has actor groups loaded
      return opportunity.actorGroups;
    }
    // Opportunity is not populated so load it with actorGroups
    const opportunityLoaded = await this.getOpportunityByIdOrFail(
      opportunity.id,
      {
        relations: ['actorGroups'],
      }
    );
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
    const opportunityLoaded = await this.getOpportunityByIdOrFail(
      opportunity.id,
      {
        relations: ['aspects'],
      }
    );
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
    const opportunityLoaded = await this.getOpportunityByIdOrFail(
      opportunity.id,
      {
        relations: ['relations'],
      }
    );

    if (!opportunityLoaded.relations)
      throw new EntityNotInitializedException(
        `Opportunity not initialised: ${opportunity.id}`,
        LogContext.CHALLENGES
      );

    return opportunityLoaded.relations;
  }

  async createOpportunity(
    opportunityData: CreateOpportunityInput
  ): Promise<IOpportunity> {
    await this.validateOpportunity(opportunityData);

    const textID = opportunityData.textID;
    opportunityData.textID = textID?.toLowerCase();

    // reate and initialise a new Opportunity using the first returned array item
    const opportunity = Opportunity.create(opportunityData);
    await this.initialiseMembers(opportunity);
    const savedOpp = await this.opportunityRepository.save(opportunity);

    return savedOpp;
  }

  async validateOpportunity(opportunityData: CreateOpportunityInput) {
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
    opportunityData: UpdateOpportunityInput
  ): Promise<IOpportunity> {
    const opportunity = await this.getOpportunityOrFail(opportunityData.ID);

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
    const opportunity = await this.getOpportunityByIdOrFail(opportunityID, {
      relations: ['actorGroups', 'aspects', 'relations', 'community'],
    });

    // First remove all groups
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

    // Remove the community
    if (opportunity.community) {
      await this.communityService.removeCommunity(opportunity.community.id);
    }

    // Remove the context
    if (opportunity.context) {
      await this.contextService.removeContext(opportunity.context.id);
    }

    if (opportunity.tagset) {
      await this.tagsetService.removeTagset(opportunity.tagset.id);
    }

    await this.opportunityRepository.remove(opportunity as Opportunity);
    return true;
  }

  async getChallengeID(opportunityID: number): Promise<number> {
    const opportunity = await this.getOpportunityByIdOrFail(opportunityID, {
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
      const actorGroupData = new CreateActorGroupInput();
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

  // Loads the challenges into the challenge entity if not already present
  async getCommunity(opportunityId: number): Promise<ICommunity> {
    const opportunity = await this.getOpportunityByIdOrFail(opportunityId, {
      relations: ['community'],
    });
    const community = opportunity.community;
    if (!community)
      throw new RelationshipNotFoundException(
        `Unable to load community for opportunity ${opportunityId}`,
        LogContext.COMMUNITY
      );
    return community;
  }

  async createProject(projectData: CreateProjectInput): Promise<IProject> {
    const opportunityId = projectData.parentID;

    this.logger.verbose?.(
      `Adding project to opportunity (${opportunityId})`,
      LogContext.CHALLENGES
    );

    const opportunity = await this.getOpportunityByIdOrFail(opportunityId);

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

  async createAspect(aspectData: CreateAspectInput): Promise<IAspect> {
    const opportunityID = aspectData.parentID;
    const opportunity = await this.getOpportunityByIdOrFail(opportunityID, {
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
    actorGroupData: CreateActorGroupInput
  ): Promise<IActorGroup> {
    const opportunityId = actorGroupData.parentID;
    const opportunity = await this.getOpportunityByIdOrFail(opportunityId, {
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

  async createRelation(relationData: CreateRelationInput): Promise<IRelation> {
    const opportunityId = relationData.parentID;
    const opportunity = await this.getOpportunityByIdOrFail(opportunityId, {
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
}
