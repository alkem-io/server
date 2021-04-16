import { CreateApplicationInput } from '@domain/community/application';
import {
  Application,
  DeleteApplicationInput,
} from '@domain/community/application';
import { ApplicationFactoryService } from '@domain/community/application/application.factory.service';

import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { NVPService } from '@domain/common/nvp/nvp.service';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectRepository(Application)
    private applicationRepository: Repository<Application>,
    private applicationFactoryService: ApplicationFactoryService,
    private nvpService: NVPService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createApplication(
    applicationData: CreateApplicationInput
  ): Promise<Application> {
    const application = await this.applicationFactoryService.createApplication(
      applicationData
    );
    return await this.applicationRepository.save(application);
  }

  async deleteApplication(
    deleteData: DeleteApplicationInput
  ): Promise<Application> {
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
  ): Promise<Application> {
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

  async delete(deleteData: DeleteApplicationInput): Promise<Application> {
    const applicationID = deleteData.ID;
    const application = await this.getApplicationOrFail(applicationID);
    const result = await this.applicationRepository.remove(application);
    result.id = deleteData.ID;
    return result;
  }
}
