import { CreateApplicationInput } from '@domain/community/application';
import {
  Application,
  IApplication,
  DeleteApplicationInput,
} from '@domain/community/application';

import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { NVPService } from '@domain/common/nvp/nvp.service';
import { UserService } from '../user/user.service';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { applicationLifecycleConfig } from '@domain/community/application/application.lifecycle.config';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectRepository(Application)
    private applicationRepository: Repository<Application>,
    private lifecycleService: LifecycleService,
    private userService: UserService,
    private nvpService: NVPService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createApplication(
    applicationData: CreateApplicationInput,
    ecoverseID?: string
  ): Promise<IApplication> {
    const application = Application.create(applicationData);
    application.ecoverseID = ecoverseID;
    (application as IApplication).user = await this.userService.getUserOrFail(
      applicationData.userId.toString()
    );

    // save the user to get the id assigned
    await this.applicationRepository.save(application);

    (application as IApplication).life44cycle = await this.lifecycleService.createLifecycle(
      application.id.toString(),
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
    const result = await this.applicationRepository.remove(
      application as Application
    );
    result.id = deleteData.ID;
    return result;
  }

  async getApplications() {
    return (await this.applicationRepository.find()) || [];
  }

  async getApplicationOrFail(
    applicationId: number,
    options?: FindOneOptions<Application>
  ): Promise<IApplication> {
    const application = await this.applicationRepository.findOne(
      { id: applicationId },
      options
    );
    if (!application)
      throw new EntityNotFoundException(
        `Application with ID ${applicationId} can not be found!`,
        LogContext.COMMUNITY
      );
    return application;
  }

  async save(application: Application): Promise<Application> {
    return await this.applicationRepository.save(application);
  }

  async delete(deleteData: DeleteApplicationInput): Promise<IApplication> {
    const application = await this.getApplicationOrFail(deleteData.ID);
    const result = await this.applicationRepository.remove(
      application as Application
    );
    result.id = deleteData.ID;
    return result;
  }
}
