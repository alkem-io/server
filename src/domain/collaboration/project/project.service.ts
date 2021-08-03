import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { AspectService } from '@domain/context/aspect/aspect.service';
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
import { UUID_LENGTH } from '@common/constants';
import { NamingService } from '@src/services/domain/naming/naming.service';
import { AuthorizationDefinition } from '@domain/common/authorization-policy';

@Injectable()
export class ProjectService {
  constructor(
    private aspectService: AspectService,
    private namingService: NamingService,
    private lifecycleService: LifecycleService,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createProject(
    projectData: CreateProjectInput,
    ecoverseID: string
  ): Promise<IProject> {
    await this.isNameAvailableOrFail(projectData.nameID, ecoverseID);
    const project: IProject = Project.create(projectData);
    project.authorization = new AuthorizationDefinition();
    project.ecoverseID = ecoverseID;

    await this.projectRepository.save(project);

    project.lifecycle = await this.lifecycleService.createLifecycle(
      project.id,
      projectLifecycleConfigDefault
    );

    return await this.projectRepository.save(project);
  }

  async deleteProject(deleteData: DeleteProjectInput): Promise<IProject> {
    const projectID = deleteData.ID;
    const project = await this.getProjectOrFail(projectID, {
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

  async getProjectInNameableScopeOrFail(
    projectID: string,
    nameableScopeID: string,
    options?: FindOneOptions<Project>
  ): Promise<IProject> {
    let project: IProject | undefined;
    if (projectID.length == UUID_LENGTH) {
      project = await this.projectRepository.findOne(
        { id: projectID, ecoverseID: nameableScopeID },
        options
      );
    } else {
      // look up based on nameID
      project = await this.projectRepository.findOne(
        { nameID: projectID, ecoverseID: nameableScopeID },
        options
      );
    }

    if (!project) {
      throw new EntityNotFoundException(
        `Unable to find Project with ID: ${projectID}`,
        LogContext.CHALLENGES
      );
    }

    return project;
  }

  async isNameAvailableOrFail(nameID: string, nameableScopeID: string) {
    if (
      !(await this.namingService.isNameIdAvailableInEcoverse(
        nameID,
        nameableScopeID
      ))
    )
      throw new ValidationException(
        `Unable to create Project: the provided nameID is already taken: ${nameID}`,
        LogContext.COLLABORATION
      );
  }

  async getProjectOrFail(
    projectID: string,
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

  async getProjects(ecoverseID: string): Promise<Project[]> {
    const projects = await this.projectRepository.find({
      ecoverseID: ecoverseID,
    });
    return projects || [];
  }

  async updateProject(projectData: UpdateProjectInput): Promise<IProject> {
    const project = await this.getProjectOrFail(projectData.ID);

    if (projectData.displayName) {
      project.displayName = projectData.displayName;
    }
    if (projectData.description) {
      project.description = projectData.description;
    }

    await this.projectRepository.save(project);

    return project;
  }

  async getLifecycle(projectId: string): Promise<ILifecycle> {
    const project = await this.getProjectOrFail(projectId, {
      relations: ['lifecycle'],
    });

    if (!project.lifecycle) {
      throw new EntityNotFoundException(
        `Unable to find Lifecycle on Project with ID: ${projectId}`,
        LogContext.COLLABORATION
      );
    }

    return project.lifecycle;
  }

  async getProjectsInEcoverseCount(ecoverseID: string): Promise<number> {
    const count = await this.projectRepository.count({
      where: { ecoverseID: ecoverseID },
    });
    return count;
  }

  async getProjectsInOpportunityCount(opportunityID: string): Promise<number> {
    return await this.projectRepository.count({
      where: { opportunity: opportunityID },
    });
  }

  async getProjectsInChallengeCount(challengeID: string): Promise<number> {
    return await this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.opportunity', 'opportunity')
      .leftJoinAndSelect('opportunity.challenge', 'challenge')
      .where('challenge.id = :challengeID')
      .setParameters({
        challengeID: challengeID,
      })
      .getCount();
  }

  async saveProject(project: IProject): Promise<IProject> {
    return await this.projectRepository.save(project);
  }
}
