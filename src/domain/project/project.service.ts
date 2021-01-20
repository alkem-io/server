import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@utils/error-handling/exceptions';
import { LogContext } from '@utils/logging/logging.contexts';
import { AspectInput } from '@domain/aspect/aspect.dto';
import { IAspect } from '@domain/aspect/aspect.interface';
import { AspectService } from '@domain/aspect/aspect.service';
import { ProjectInput } from './project.dto';
import { Project } from './project.entity';
import { IProject } from './project.interface';

@Injectable()
export class ProjectService {
  constructor(
    private aspectService: AspectService,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createProject(projectData: ProjectInput): Promise<IProject> {
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

  async removeProject(projectID: number): Promise<boolean> {
    const Project = await this.getProjectByID(projectID);
    if (!Project)
      throw new EntityNotFoundException(
        `Not able to locate Project with the specified ID: ${projectID}`,
        LogContext.CHALLENGES
      );
    await this.projectRepository.remove(Project as Project);
    return true;
  }

  async getProjectByID(projectID: number): Promise<IProject> {
    const project = await this.projectRepository.findOne({ id: projectID });
    if (!project)
      throw new EntityNotFoundException(
        `Unable to find Project with ID: ${projectID}`,
        LogContext.CHALLENGES
      );
    return project;
  }

  async getProjects(): Promise<Project[]> {
    const projects = await this.projectRepository.find();
    return projects || [];
  }

  async updateProject(
    projectID: number,
    projectData: ProjectInput
  ): Promise<IProject> {
    const project = await this.getProjectByID(projectID);

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

  async createAspect(
    projectId: number,
    aspectData: AspectInput
  ): Promise<IAspect> {
    const project = await this.getProjectByID(projectId);

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
