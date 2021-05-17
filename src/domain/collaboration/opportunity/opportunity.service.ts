import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { Opportunity, IOpportunity } from '@domain/collaboration/opportunity';
import { LogContext } from '@common/enums';
import { ProjectService } from '../project/project.service';
import { RelationService } from '../relation/relation.service';
import { CreateRelationInput, IRelation } from '@domain/collaboration/relation';
import { IProject, CreateProjectInput } from '@domain/collaboration/project';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class OpportunityService {
  constructor(
    private projectService: ProjectService,
    private relationService: RelationService,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createOpportunity(): Promise<IOpportunity> {
    const opportunity: IOpportunity = new Opportunity();
    opportunity.projects = [];
    opportunity.relations = [];

    return await this.saveOpportunity(opportunity);
  }

  async getOpportunityOrFail(
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

  async deleteOpportunity(opportunityID: number): Promise<IOpportunity> {
    // Note need to load it in with all contained entities so can remove fully
    const opportunity = await this.getOpportunityOrFail(opportunityID, {
      relations: ['relations', 'projects'],
    });

    if (opportunity.relations) {
      for (const relation of opportunity.relations) {
        await this.relationService.deleteRelation({ ID: relation.id });
      }
    }

    return await this.opportunityRepository.remove(opportunity as Opportunity);
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

    const opportunityLoaded = await this.getOpportunityOrFail(opportunity.id, {
      relations: ['relations'],
    });

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

    const opportunity = await this.getOpportunityOrFail(opportunityId);

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
    const opportunity = await this.getOpportunityOrFail(opportunityId, {
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
