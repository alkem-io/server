import { ApplicationInput } from '@domain/community/application/application.dto';
import {
  Application,
  ApplicationStatus,
} from '@domain/community/application/application.entity';
import { ApplicationFactoryService } from '@domain/community/application/application.factory.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { ApolloError } from 'apollo-server-express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { CommunityService } from '../community/community.service';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectRepository(Application)
    private applicationReposity: Repository<Application>,
    private applicationService: ApplicationService,
    private communityService: CommunityService,
    private applicationFactoryService: ApplicationFactoryService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createApplication(
    applicationData: ApplicationInput
  ): Promise<Application> {
    const application = await this.applicationFactoryService.createApplication(
      applicationData
    );
    return await this.applicationReposity.save(application);
  }

  async removeApplication(applicationID: number): Promise<Application> {
    const application = await this.getApplicationOrFail(applicationID);
    const result = await this.applicationReposity.remove(
      application as Application
    );
    return result;
  }

  async getApplications() {
    return (await this.applicationReposity.find()) || [];
  }

  async getApplicationOrFail(
    applicationId: number,
    options?: FindOneOptions<Application>
  ): Promise<Application> {
    const application = await this.applicationReposity.findOne(
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

  async approveApplication(applicationId: number) {
    const application = await this.applicationService.getApplicationOrFail(
      applicationId
    );

    if (application.status == ApplicationStatus.approved) {
      throw new ApolloError('Application has already been approved!');
    } else if (application.status == ApplicationStatus.rejected) {
      throw new ApolloError('Application has already been rejected!');
    }

    if (!application.community)
      throw new RelationshipNotFoundException(
        `Unable to load community for application ${applicationId} `,
        LogContext.COMMUNITY
      );
    await this.communityService.addMember(
      application.user.id,
      application.community?.id
    );

    application.status = ApplicationStatus.approved;

    await this.applicationReposity.save(application);

    return application;
  }
}
