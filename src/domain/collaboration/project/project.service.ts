import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import {
  Project,
  IProject,
  projectLifecycleConfigDefault,
} from '@domain/collaboration/project';
import { ILifecycle } from '@domain/common/lifecycle';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { UUID_LENGTH } from '@common/constants';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { ProfileService } from '@domain/common/profile/profile.service';
import { DeleteProjectInput } from './dto/project.dto.delete';
import { UpdateProjectInput } from './dto/project.dto.update';
import { IProfile } from '@domain/common/profile/profile.interface';
import { CreateProjectInput } from './dto/project.dto.create';

@Injectable()
export class ProjectService {
  constructor(
    private namingService: NamingService,
    private profileService: ProfileService,
    private lifecycleService: LifecycleService,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createProject(
    projectData: CreateProjectInput,
    spaceID: string
  ): Promise<IProject> {
    await this.isNameAvailableOrFail(projectData.nameID, spaceID);
    const project: IProject = Project.create(projectData);
    project.authorization = new AuthorizationPolicy();
    project.spaceID = spaceID;

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
      relations: { lifecycle: true },
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
  ): Promise<IProject | never> {
    let project: IProject | null = null;
    if (projectID.length == UUID_LENGTH) {
      project = await this.projectRepository.findOne({
        where: { id: projectID, spaceID: nameableScopeID },
        ...options,
      });
    }

    if (!project) {
      // look up based on nameID instead
      project = await this.projectRepository.findOne({
        where: { nameID: projectID, spaceID: nameableScopeID },
        ...options,
      });
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
      !(await this.namingService.isNameIdAvailableInSpace(
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
    const project = await this.projectRepository.findOne({
      where: { id: projectID },
      ...options,
    });
    if (!project)
      throw new EntityNotFoundException(
        `Unable to find Project with ID: ${projectID}`,
        LogContext.CHALLENGES
      );
    return project;
  }

  async save(project: IProject): Promise<IProject> {
    return await this.projectRepository.save(project);
  }

  async getProjects(spaceID: string): Promise<Project[]> {
    const projects = await this.projectRepository.findBy({
      spaceID: spaceID,
    });
    return projects || [];
  }

  async updateProject(projectData: UpdateProjectInput): Promise<IProject> {
    const project = await this.getProjectOrFail(projectData.ID);

    if (projectData.profileData) {
      project.profile = await this.profileService.updateProfile(
        project.profile,
        projectData.profileData
      );
    }

    await this.projectRepository.save(project);

    return project;
  }

  public async getProfile(
    projectInput: IProject,
    relations?: FindOptionsRelations<IProject>
  ): Promise<IProfile> {
    const project = await this.getProjectOrFail(projectInput.id, {
      relations: { profile: true, ...relations },
    });
    if (!project.profile)
      throw new EntityNotFoundException(
        `Project profile not initialised: ${projectInput.id}`,
        LogContext.COLLABORATION
      );

    return project.profile;
  }

  async getLifecycle(projectId: string): Promise<ILifecycle> {
    const project = await this.getProjectOrFail(projectId, {
      relations: { lifecycle: true },
    });

    if (!project.lifecycle) {
      throw new EntityNotFoundException(
        `Unable to find Lifecycle on Project with ID: ${projectId}`,
        LogContext.COLLABORATION
      );
    }

    return project.lifecycle;
  }

  async getProjectsInSpaceCount(spaceID: string): Promise<number> {
    const count = await this.projectRepository.countBy({ spaceID: spaceID });
    return count;
  }

  async getProjectsInOpportunityCount(opportunityID: string): Promise<number> {
    return await this.projectRepository.countBy({
      opportunity: { id: opportunityID },
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
