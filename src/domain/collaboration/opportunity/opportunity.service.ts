import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import {
  Opportunity,
  IOpportunity,
  CreateOpportunityInput,
  UpdateOpportunityInput,
} from '@domain/collaboration/opportunity';
import { LogContext } from '@common/enums';
import { ProjectService } from '../project/project.service';
import { RelationService } from '../relation/relation.service';
import { CreateRelationInput, IRelation } from '@domain/collaboration/relation';
import { IProject, CreateProjectInput } from '@domain/collaboration/project';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { BaseChallengeService } from '@domain/challenge/base-challenge/base.challenge.service';
import validator from 'validator';
@Injectable()
export class OpportunityService {
  constructor(
    private challengeBaseService: BaseChallengeService,
    private projectService: ProjectService,
    private relationService: RelationService,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createOpportunity(
    opportunityData: CreateOpportunityInput,
    ecoverseID: string
  ): Promise<IOpportunity> {
    const opportunity: IOpportunity = Opportunity.create(opportunityData);
    opportunity.ecoverseID = ecoverseID;
    opportunity.projects = [];
    opportunity.relations = [];

    await this.challengeBaseService.initialise(
      opportunity,
      opportunityData,
      this.opportunityRepository
    );

    return await this.saveOpportunity(opportunity);
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

  async getOpportunityByIdOrFail(
    opportunityID: number,
    options?: FindOneOptions<Opportunity>
  ): Promise<IOpportunity> {
    const Opportunity = await this.opportunityRepository.findOne(
      { id: opportunityID },
      options
    );
    if (!Opportunity)
      throw new EntityNotFoundException(
        `No Opportunity found with the given id: ${opportunityID}`,
        LogContext.COLLABORATION
      );
    return Opportunity;
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
        `Unable to find Opportunity with ID: ${opportunityID}`,
        LogContext.COLLABORATION
      );
    return opportunity;
  }

  async deleteOpportunity(opportunityID: number): Promise<IOpportunity> {
    // Note need to load it in with all contained entities so can remove fully
    const opportunity = await this.getOpportunityByIdOrFail(opportunityID, {
      relations: ['community', 'context', 'lifecycle', 'relations', 'projects'],
    });

    await this.challengeBaseService.deleteEntities(opportunity);

    if (opportunity.relations) {
      for (const relation of opportunity.relations) {
        await this.relationService.deleteRelation({ ID: relation.id });
      }
    }

    return await this.opportunityRepository.remove(opportunity as Opportunity);
  }

  async updateOpportunity(
    opportunityData: UpdateOpportunityInput
  ): Promise<IOpportunity> {
    return await this.challengeBaseService.update(
      opportunityData,
      this.opportunityRepository
    );
  }

  async saveOpportunity(opportunity: IOpportunity): Promise<IOpportunity> {
    return await this.opportunityRepository.save(opportunity);
  }

  // Loads the aspects into the Opportunity entity if not already present
  async getRelations(opportunity: Opportunity): Promise<IRelation[]> {
    if (opportunity.relations && opportunity.relations.length > 0) {
      // opportunity already has relations loaded
      return opportunity.relations;
    }

    const opportunityLoaded = await this.getOpportunityByIdOrFail(
      opportunity.id,
      {
        relations: ['relations'],
      }
    );

    if (!opportunityLoaded.relations)
      throw new EntityNotInitializedException(
        `Opportunity not initialised: ${opportunity.id}`,
        LogContext.COLLABORATION
      );

    return opportunityLoaded.relations;
  }

  async createProject(projectData: CreateProjectInput): Promise<IProject> {
    const opportunityId = projectData.parentID;

    this.logger.verbose?.(
      `Adding project to opportunity (${opportunityId})`,
      LogContext.COLLABORATION
    );

    const opportunity = await this.getOpportunityByIdOrFail(opportunityId);

    // Check that do not already have an Project with the same name
    const name = projectData.name;
    const existingProject = opportunity.projects?.find(
      project => project.name === name || project.textID === projectData.textID
    );
    if (existingProject)
      throw new ValidationException(
        `Already have an Project with the provided name or textID: ${name} - ${projectData.textID}`,
        LogContext.COLLABORATION
      );

    const project = await this.projectService.createProject(projectData);
    if (!opportunity.projects)
      throw new EntityNotInitializedException(
        `Opportunity (${opportunityId}) not initialised`,
        LogContext.COLLABORATION
      );
    opportunity.projects.push(project);
    await this.opportunityRepository.save(opportunity);
    return project;
  }

  async createRelation(relationData: CreateRelationInput): Promise<IRelation> {
    const opportunityId = relationData.parentID;
    const opportunity = await this.getOpportunityByIdOrFail(opportunityId, {
      relations: ['relations'],
    });

    if (!opportunity.relations)
      throw new EntityNotInitializedException(
        `Opportunity (${opportunityId}) not initialised`,
        LogContext.COLLABORATION
      );

    const relation = await this.relationService.createRelation(relationData);
    opportunity.relations.push(relation);
    await this.opportunityRepository.save(opportunity);
    return relation;
  }
}
