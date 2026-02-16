import { LogContext } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import {
  Application,
  CreateApplicationInput,
  DeleteApplicationInput,
  IApplication,
} from '@domain/access/application';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { NVPService } from '@domain/common/nvp/nvp.service';
import { IQuestion } from '@domain/common/question/question.interface';
import { UserService } from '@domain/community/user/user.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindManyOptions, FindOneOptions, Repository } from 'typeorm';
import { IContributor } from '../../community/contributor/contributor.interface';
import { RoleSetCacheService } from '../role-set/role.set.service.cache';
import { ApplicationLifecycleService } from './application.service.lifecycle';

@Injectable()
export class ApplicationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(Application)
    private applicationRepository: Repository<Application>,
    private userService: UserService,
    private lifecycleService: LifecycleService,
    private applicationLifecycleService: ApplicationLifecycleService,
    private nvpService: NVPService,
    private roleSetCacheService: RoleSetCacheService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createApplication(
    applicationData: CreateApplicationInput
  ): Promise<IApplication> {
    const application: IApplication = Application.create(applicationData);
    application.user = await this.userService.getUserOrFail(
      applicationData.userID
    );

    application.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.APPLICATION
    );
    // save the user to get the id assigned
    await this.applicationRepository.save(application);

    application.lifecycle = await this.lifecycleService.createLifecycle();

    return await this.applicationRepository.save(application);
  }

  async deleteApplication(
    deleteData: DeleteApplicationInput
  ): Promise<IApplication> {
    const applicationID = deleteData.ID;
    const application = await this.getApplicationOrFail(applicationID, {
      relations: { roleSet: true, user: true },
    });
    if (application.questions) {
      for (const question of application.questions) {
        await this.nvpService.removeNVP(question.id);
      }
    }

    await this.lifecycleService.deleteLifecycle(application.lifecycle.id);
    if (application.authorization)
      await this.authorizationPolicyService.delete(application.authorization);

    const result = await this.applicationRepository.remove(
      application as Application
    );
    result.id = applicationID;

    if (application.user?.id && application.roleSet?.id) {
      await this.roleSetCacheService.deleteOpenApplicationFromCache(
        application.user?.id,
        application.roleSet?.id
      );
    }

    return result;
  }

  async getApplicationOrFail(
    applicationId: string,
    options?: FindOneOptions<Application>
  ): Promise<Application | never> {
    const application = await this.applicationRepository.findOne({
      ...options,
      where: {
        ...options?.where,
        id: applicationId,
      },
    });
    if (!application)
      throw new EntityNotFoundException(
        `Application with ID ${applicationId} can not be found!`,
        LogContext.COMMUNITY
      );
    return application;
  }

  async save(application: IApplication): Promise<IApplication> {
    return await this.applicationRepository.save(application);
  }

  async getContributor(applicationID: string): Promise<IContributor> {
    const application = await this.getApplicationOrFail(applicationID, {
      relations: { user: true },
    });
    const user = application.user;
    if (!user)
      throw new RelationshipNotFoundException(
        `Unable to load Contributor for Application ${applicationID} `,
        LogContext.COMMUNITY
      );
    return user;
  }

  async findExistingApplications(
    userID: string,
    roleSetID: string
  ): Promise<IApplication[]> {
    const existingApplications = await this.applicationRepository.find({
      where: {
        user: { id: userID },
        roleSet: { id: roleSetID },
      },
      relations: {
        roleSet: true,
        user: true,
      },
    });
    if (existingApplications.length > 0) return existingApplications;
    return [];
  }

  public async findApplicationsForUser(
    userID: string,
    states: string[] = []
  ): Promise<IApplication[]> {
    const findOpts: FindManyOptions<Application> = {
      relations: { roleSet: true },
      where: { user: { id: userID } },
    };

    if (states.length) {
      findOpts.relations = {
        ...findOpts.relations,
        lifecycle: true,
      };
      findOpts.select = {
        lifecycle: {
          machineState: true,
        },
      };
    }

    const applications = await this.applicationRepository.find(findOpts);

    if (states.length) {
      const filteredApplications = applications.filter(app =>
        states.includes(
          this.applicationLifecycleService.getState(app.lifecycle)
        )
      );
      return filteredApplications;
    }

    return applications;
  }

  async getLifecycleState(applicationID: string): Promise<string> {
    const invitation = await this.getApplicationOrFail(applicationID);
    const lifecycle = invitation.lifecycle;

    return this.applicationLifecycleService.getState(lifecycle);
  }

  async isFinalizedApplication(applicationID: string): Promise<boolean> {
    const application = await this.getApplicationOrFail(applicationID);

    return this.applicationLifecycleService.isFinalState(application.lifecycle);
  }

  /** Synchronous check when the entity (with eager lifecycle) is already loaded. */
  isApplicationFinalized(application: IApplication): boolean {
    return this.applicationLifecycleService.isFinalState(application.lifecycle);
  }

  async getQuestionsSorted(application: IApplication): Promise<IQuestion[]> {
    const questions = application.questions;
    if (!questions) {
      throw new RelationshipNotFoundException(
        `Unable to load Questions for Application ${application.id} `,
        LogContext.COMMUNITY
      );
    }
    // Sort according to order
    const sortedQuestions = questions.sort((a, b) =>
      a.sortOrder > b.sortOrder ? 1 : -1
    );
    return sortedQuestions;
  }
}
