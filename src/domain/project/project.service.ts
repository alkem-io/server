import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { AspectInput } from '../aspect/aspect.dto';
import { IAspect } from '../aspect/aspect.interface';
import { AspectService } from '../aspect/aspect.service';
import { ProjectInput } from './project.dto';
import { Project } from './project.entity';
import { IProject } from './project.interface';

@Injectable()
export class ProjectService {
  constructor(
    private aspectService: AspectService,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger
  ) {}

  async createProject(projectData: ProjectInput): Promise<IProject> {
    const project = new Project(projectData.name);
    project.description = projectData.description;
    project.state = projectData.state;

    await this.projectRepository.save(Project);
    return project;
  }

  async removeProject(projectID: number): Promise<boolean> {
    const Project = await this.getProject(projectID);
    if (!Project)
      throw new Error(
        `Not able to locate Project with the specified ID: ${projectID}`
      );
    await this.projectRepository.remove(Project as Project);
    return true;
  }

  async getProject(ProjectID: number): Promise<IProject | undefined> {
    return await this.projectRepository.findOne({ id: ProjectID });
  }

  async updateProject(
    projectID: number,
    projectData: ProjectInput
  ): Promise<IProject> {
    const project = await this.getProject(projectID);
    if (!project)
      throw new Error(
        `Not able to locate Project with the specified ID: ${projectID}`
      );

    // Copy over the received data
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
    const project = await this.getProject(projectId);
    if (!project)
      throw new Error(`Unalbe to locate project with id: ${projectId}`);

    // Check that do not already have an aspect with the same title
    const title = aspectData.title;
    const existingAspect = project.aspects?.find(
      aspect => aspect.title === title
    );
    if (existingAspect)
      throw new Error(
        `Already have an aspect with the provided title: ${title}`
      );

    const aspect = await this.aspectService.createAspect(aspectData);
    if (!project.aspects)
      throw new Error(`Project (${projectId}) not initialised`);
    project.aspects.push(aspect);
    await this.projectRepository.save(project);
    return aspect;
  }
}
