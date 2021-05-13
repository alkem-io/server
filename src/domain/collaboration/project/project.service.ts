import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { CreateAspectInput } from '@domain/context/aspect';
import { IAspect } from '@domain/context/aspect/aspect.interface';
import { AspectService } from '@domain/context/aspect/aspect.service';
import validator from 'validator';
import {
  UpdateProjectInput,
  CreateProjectInput,
  Project,
  IProject,
  projectLifecycleConfigDefault,
} from '@domain/collaboration/project';
import { DeleteProjectInput } from './project.dto.delete';
import { ILifecycle } from '@domain/common/lifecycle';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';

@Injectable()
export class ProjectService {
  constructor(
    private aspectService: AspectService,
    private lifecycleService: LifecycleService,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createProject(
    projectData: CreateProjectInput,
    ecoverseID?: string
  ): Promise<IProject> {
    const project: IProject = Project.create(projectData);
    (project as Project).ecoverseID = ecoverseID;

    await this.projectRepository.save(project);

    project.lifecycle = await this.lifecycleService.createLifecycle(
      project.id.toString(),
      projectLifecycleConfigDefault
    );

    return await this.projectRepository.save(project);
  }

  async deleteProject(deleteData: DeleteProjectInput): Promise<IProject> {
    const projectID = deleteData.ID;
    const project = await this.getProjectByIdOrFail(projectID, {
      relations: ['lifecycle'],
    });
    if (!project)
      throw new EntityNotFoundException(
        `Not able to locate Project with the specified ID: ${projectID}`,
        LogContext.CHALLENGES
      );
    // Remove the lifecycle
    if (project.lifecycle) {
      await this.lifecycleService.deleteLifecycle(project.lifecycle.id);
    }
    const result = await this.projectRepository.remove(project as Project);
    result.id = projectID;
    return result;
  }

  async getProjectByIdOrFail(
    projectID: number,
    options?: FindOneOptions<Project>
  ): Promise<IProject> {
    const project = await this.projectRepository.findOne(
      { id: projectID },
      options
    );
    if (!project)
      throw new EntityNotFoundException(
        `Unable to find Project with ID: ${projectID}`,
        LogContext.CHALLENGES
      );
    return project;
  }

  async getProjectOrFail(
    projectID: string,
    options?: FindOneOptions<Project>
  ): Promise<IProject> {
    if (validator.isNumeric(projectID)) {
      const idInt: number = parseInt(projectID);
      return await this.getProjectByIdOrFail(idInt, options);
    }
    throw new EntityNotFoundException(
      `Unable to find Project with ID: ${projectID}`,
      LogContext.CHALLENGES
    );
  }

  async getProjects(ecoverseID: string): Promise<Project[]> {
    const projects = await this.projectRepository.find({
      ecoverseID: ecoverseID,
    });
    return projects || [];
  }

  async updateProject(projectData: UpdateProjectInput): Promise<IProject> {
    const project = await this.getProjectOrFail(projectData.ID);

    if (projectData.name) {
      project.name = projectData.name;
    }
    if (projectData.description) {
      project.description = projectData.description;
    }

    await this.projectRepository.save(project);

    return project;
  }

  // Lazy load the lifecycle
  async getLifecycle(projectId: number): Promise<ILifecycle> {
    const project = await this.getProjectByIdOrFail(projectId, {
      relations: ['lifecycle'],
    });

    // if no lifecycle then create + save...
    if (!project.lifecycle) {
      project.lifecycle = await this.lifecycleService.createLifecycle(
        projectId.toString(),
        projectLifecycleConfigDefault
      );
      await this.projectRepository.save(project);
    }

    return project.lifecycle;
  }

  async createAspect(aspectData: CreateAspectInput): Promise<IAspect> {
    const projectId = aspectData.parentID;
    const project = await this.getProjectByIdOrFail(projectId);

    // Check that do not already have an aspect with the same title
    const title = aspectData.title;
    const existingAspect = project.aspects?.find(
      aspect => aspect.title === title
    );
    if (existingAspect)
      throw new ValidationException(
        `Already have an aspect with the provided title: ${title}`,
        LogContext.CHALLENGES
      );

    const aspect = await this.aspectService.createAspect(aspectData);
    if (!project.aspects)
      throw new EntityNotInitializedException(
        `Project (${projectId}) not initialised`,
        LogContext.CHALLENGES
      );
    project.aspects.push(aspect);
    await this.projectRepository.save(project);
    return aspect;
  }
}
