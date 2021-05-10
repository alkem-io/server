import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import {
  Collaboration,
  ICollaboration,
} from '@domain/collaboration/collaboration';
import { LogContext } from '@common/enums';
import { ProjectService } from '../project/project.service';
import { RelationService } from '../relation/relation.service';
import { CreateRelationInput, IRelation } from '@domain/collaboration/relation';
import { IProject, CreateProjectInput } from '@domain/collaboration/project';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class CollaborationService {
  constructor(
    private projectService: ProjectService,
    private relationService: RelationService,
    @InjectRepository(Collaboration)
    private collaborationRepository: Repository<Collaboration>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createCollaboration(): Promise<ICollaboration> {
    const collaboration: ICollaboration = new Collaboration();
    collaboration.projects = [];
    collaboration.relations = [];

    return await this.saveCollaboration(collaboration);
  }

  async getCollaborationOrFail(
    collaborationID: number,
    options?: FindOneOptions<Collaboration>
  ): Promise<ICollaboration> {
    const collaboration = await this.collaborationRepository.findOne(
      { id: collaborationID },
      options
    );
    if (!collaboration)
      throw new EntityNotFoundException(
        `No Collaboration found with the given id: ${collaborationID}`,
        LogContext.COLLABORATION
      );
    return collaboration;
  }

  async deleteCollaboration(collaborationID: number): Promise<ICollaboration> {
    // Note need to load it in with all contained entities so can remove fully
    const collaboration = await this.getCollaborationOrFail(collaborationID, {
      relations: ['relations', 'projects'],
    });

    if (collaboration.relations) {
      for (const relation of collaboration.relations) {
        await this.relationService.deleteRelation({ ID: relation.id });
      }
    }

    return await this.collaborationRepository.remove(
      collaboration as Collaboration
    );
  }

  async saveCollaboration(
    collaboration: ICollaboration
  ): Promise<ICollaboration> {
    return await this.collaborationRepository.save(collaboration);
  }

  // Loads the aspects into the Opportunity entity if not already present
  async loadRelations(collaboration: Collaboration): Promise<IRelation[]> {
    if (collaboration.relations && collaboration.relations.length > 0) {
      // opportunity already has relations loaded
      return collaboration.relations;
    }
    // Opportunity is not populated so load it with actorGroups
    const collaborationLoaded = await this.getCollaborationOrFail(
      collaboration.id,
      {
        relations: ['relations'],
      }
    );

    if (!collaborationLoaded.relations)
      throw new EntityNotInitializedException(
        `Opportunity not initialised: ${collaboration.id}`,
        LogContext.CHALLENGES
      );

    return collaborationLoaded.relations;
  }

  async createProject(projectData: CreateProjectInput): Promise<IProject> {
    const collaborationId = projectData.parentID;

    this.logger.verbose?.(
      `Adding project to opportunity (${collaborationId})`,
      LogContext.CHALLENGES
    );

    const opportunity = await this.getCollaborationOrFail(collaborationId);

    // Check that do not already have an Project with the same name
    const name = projectData.name;
    const existingProject = opportunity.projects?.find(
      project => project.name === name || project.textID === projectData.textID
    );
    if (existingProject)
      throw new ValidationException(
        `Already have an Project with the provided name or textID: ${name} - ${projectData.textID}`,
        LogContext.CHALLENGES
      );

    const project = await this.projectService.createProject(projectData);
    if (!opportunity.projects)
      throw new EntityNotInitializedException(
        `Opportunity (${collaborationId}) not initialised`,
        LogContext.CHALLENGES
      );
    opportunity.projects.push(project);
    await this.collaborationRepository.save(opportunity);
    return project;
  }

  async createRelation(relationData: CreateRelationInput): Promise<IRelation> {
    const collaborationId = relationData.parentID;
    const opportunity = await this.getCollaborationOrFail(collaborationId, {
      relations: ['relations'],
    });

    if (!opportunity.relations)
      throw new EntityNotInitializedException(
        `Opportunity (${collaborationId}) not initialised`,
        LogContext.CHALLENGES
      );

    const relation = await this.relationService.createRelation(relationData);
    opportunity.relations.push(relation);
    await this.collaborationRepository.save(opportunity);
    return relation;
  }
}
