import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
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
} from '@domain/collaboration/project';
import { DeleteProjectInput } from './project.dto.delete';

@Injectable()
export class ProjectService {
  constructor(
    private aspectService: AspectService,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createProject(projectData: CreateProjectInput): Promise<IProject> {
    const textID = projectData.textID;
    if (!textID || textID.length < 3)
      throw new ValidationException(
        `Text ID for the project is required and has a minimum length of 3: ${textID}`,
        LogContext.CHALLENGES
      );
    const expression = /^[a-zA-Z0-9.\-_]+$/;
    const textIdCheck = expression.test(textID);
    if (!textIdCheck)
      throw new ValidationException(
        `Required field textID provided not in the correct format: ${textID}`,
        LogContext.CHALLENGES
      );

    const project = new Project(projectData.name, textID.toLowerCase());
    project.description = projectData.description;
    project.state = projectData.state;

    await this.projectRepository.save(project);
    return project;
  }

  async deleteProject(deleteData: DeleteProjectInput): Promise<IProject> {
    const projectID = deleteData.ID;
    const project = await this.getProjectByIdOrFail(projectID);
    if (!project)
      throw new EntityNotFoundException(
        `Not able to locate Project with the specified ID: ${projectID}`,
        LogContext.CHALLENGES
      );
    const { id } = project;
    const result = await this.projectRepository.remove(project as Project);
    return {
      ...result,
      id,
    };
  }

  async getProjectByIdOrFail(projectID: number): Promise<IProject> {
    const project = await this.projectRepository.findOne({ id: projectID });
    if (!project)
      throw new EntityNotFoundException(
        `Unable to find Project with ID: ${projectID}`,
        LogContext.CHALLENGES
      );
    return project;
  }

  async getProjectOrFail(projectID: string): Promise<IProject> {
    if (validator.isNumeric(projectID)) {
      const idInt: number = parseInt(projectID);
      return await this.getProjectByIdOrFail(idInt);
    }
    throw new EntityNotFoundException(
      `Unable to find Project with ID: ${projectID}`,
      LogContext.CHALLENGES
    );
  }

  async getProjects(): Promise<Project[]> {
    const projects = await this.projectRepository.find();
    return projects || [];
  }

  async updateProject(projectData: UpdateProjectInput): Promise<IProject> {
    const project = await this.getProjectOrFail(projectData.ID);

    // Note: do not update the textID

    // Copy over the received data
    if (projectData.name) {
      project.name = projectData.name;
    }
    if (projectData.description) {
      project.description = projectData.description;
    }
    if (projectData.state) {
      project.state = projectData.state;
    }

    await this.projectRepository.save(project);

    return project;
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
