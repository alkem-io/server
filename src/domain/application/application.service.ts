import { ApplicationInput } from '@domain/application/application.dto';
import {
  Application,
  ApplicationStatus,
} from '@domain/application/application.entity';
import { ApplicationFactoryService } from '@domain/application/application.factory';
import { ChallengeService } from '@domain/challenge/challenge.service';
import { EcoverseService } from '@domain/ecoverse/ecoverse.service';
import { OpportunityService } from '@domain/opportunity/opportunity.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityNotFoundException } from '@utils/error-handling/exceptions';
import { LogContext } from '@utils/logging/logging.contexts';
import { ApolloError } from 'apollo-server-express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectRepository(Application)
    private applicationReposity: Repository<Application>,
    private ecoverseService: EcoverseService,
    private challengeService: ChallengeService,
    private opportunityService: OpportunityService,
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

  async getApplications() {
    return (await this.applicationReposity.find()) || [];
  }

  async getApplication(id: number) {
    return await this.applicationReposity.findOne(id);
  }

  async approveApplication(id: number) {
    console.time('Load application');
    const application = await this.applicationReposity.findOne({
      where: { id },
      relations: ['ecoverse', 'challenge', 'opportunity'],
    });

    console.timeEnd('Load application');
    if (!application)
      throw new EntityNotFoundException(
        `Application with id ${id} does not exist.`,
        LogContext.COMMUNITY
      );

    if (application.status == ApplicationStatus.approved) {
      throw new ApolloError('Application has already been approved!');
    } else if (application.status == ApplicationStatus.rejected) {
      throw new ApolloError('Application has already been rejected!');
    }

    if (application.ecoverse && application.ecoverse.length > 0) {
      // TBD: Add members to ecoverse.
      //await this.assignUser(application.ecoverse[0], application.user);
    } else if (application.challenge && application.challenge.length > 0) {
      await this.challengeService.addMember(
        application.user.id,
        application.challenge[0].id
      );
    } else if (application.opportunity && application.opportunity.length > 0) {
      await this.opportunityService.addMember(
        application.user.id,
        application.opportunity[0].id
      );
    }

    application.status = ApplicationStatus.approved;

    await this.applicationReposity.save(application);

    return application;
  }
}
