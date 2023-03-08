import { CreateApplicationInput } from '@domain/community/application';
import {
  Application,
  IApplication,
  DeleteApplicationInput,
} from '@domain/community/application';

import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { NVPService } from '@domain/common/nvp/nvp.service';
import { UserService } from '@domain/community/user/user.service';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { applicationLifecycleConfig } from '@domain/community/application/application.lifecycle.config';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IUser } from '@domain/community/user/user.interface';
import { IQuestion } from '@domain/common/question/question.interface';

@Injectable()
export class ApplicationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(Application)
    private applicationRepository: Repository<Application>,
    private lifecycleService: LifecycleService,
    private userService: UserService,
    private nvpService: NVPService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createApplication(
    applicationData: CreateApplicationInput,
    hubID = ''
  ): Promise<IApplication> {
    const application: IApplication = Application.create(applicationData);
    application.hubID = hubID;
    application.user = await this.userService.getUserOrFail(
      applicationData.userID
    );

    application.authorization = new AuthorizationPolicy();
    // save the user to get the id assigned
    await this.applicationRepository.save(application);

    application.lifecycle = await this.lifecycleService.createLifecycle(
      application.id,
      applicationLifecycleConfig
    );

    return await this.applicationRepository.save(application);
  }

  async deleteApplication(
    deleteData: DeleteApplicationInput
  ): Promise<IApplication> {
    const applicationID = deleteData.ID;
    const application = await this.getApplicationOrFail(applicationID);
    if (application.questions) {
      for (const question of application.questions) {
        await this.nvpService.removeNVP(question.id);
      }
    }
    if (application.authorization)
      await this.authorizationPolicyService.delete(application.authorization);

    const result = await this.applicationRepository.remove(
      application as Application
    );
    result.id = applicationID;
    return result;
  }

  async getApplications() {
    return (await this.applicationRepository.find()) || [];
  }

  async getApplicationOrFail(
    applicationId: string,
    options?: FindOneOptions<Application>
  ): Promise<IApplication | never> {
    let where;
    if (options && options.where)
      where = { ...options?.where, id: applicationId };
    else where = { id: applicationId };
    const application = await this.applicationRepository.findOne({
      ...options,
      where,
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

  async getUser(applicationID: string): Promise<IUser> {
    const application = await this.getApplicationOrFail(applicationID, {
      relations: ['user'],
    });
    const user = application.user;
    if (!user)
      throw new RelationshipNotFoundException(
        `Unable to load User for Application ${applicationID} `,
        LogContext.COMMUNITY
      );
    return user;
  }

  async getApplicationState(applicationID: string): Promise<string> {
    const application = await this.getApplicationOrFail(applicationID);
    const lifecycle = application.lifecycle;
    if (lifecycle) {
      return await this.lifecycleService.getState(lifecycle);
    }
    return '';
  }

  async findExistingApplications(
    userID: string,
    communityID: string
  ): Promise<IApplication[]> {
    const existingApplications = await this.applicationRepository
      .createQueryBuilder('application')
      .leftJoinAndSelect('application.user', 'user')
      .leftJoinAndSelect('application.community', 'community')
      .where('user.id = :userID')
      .andWhere('community.id = :communityID')
      .setParameters({
        userID: `${userID}`,
        communityID: communityID,
      })
      .getMany();
    if (existingApplications.length > 0) return existingApplications;
    return [];
  }

  async findApplicationsForUser(userID: string): Promise<IApplication[]> {
    const existingApplications = await this.applicationRepository
      .createQueryBuilder('application')
      .leftJoinAndSelect('application.user', 'user')
      .leftJoinAndSelect('application.community', 'community')
      .where('user.id = :userID')
      .setParameters({
        userID: `${userID}`,
      })
      .getMany();
    if (existingApplications.length > 0) return existingApplications;
    return [];
  }

  async isFinalizedApplication(applicationID: string): Promise<boolean> {
    const application = await this.getApplicationOrFail(applicationID);
    const lifecycle = application.lifecycle;
    if (!lifecycle) {
      throw new RelationshipNotFoundException(
        `Unable to load Lifecycle for Application ${application.id} `,
        LogContext.COMMUNITY
      );
    }
    return await this.lifecycleService.isFinalState(lifecycle);
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
