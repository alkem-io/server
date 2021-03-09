import { ApplicationInput } from '@domain/community/application/application.dto';
import {
  Application,
  ApplicationStatus,
} from '@domain/community/application/application.entity';
import { ApplicationFactoryService } from '@domain/community/application/application.factory';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { EcoverseService } from '@domain/challenge/ecoverse/ecoverse.service';
import { OpportunityService } from '@domain/challenge/opportunity/opportunity.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { ApolloError } from 'apollo-server-express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { getManager, Repository } from 'typeorm';

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

  async getApplicationOrFail(id: number): Promise<Application> {
    const app = await this.applicationReposity.findOne(id);
    if (!app)
      throw new EntityNotFoundException(
        `Application with ID ${id} can not be found!`,
        LogContext.COMMUNITY
      );
    return app;
  }

  async approveApplication(id: number) {
    const application = await this.applicationReposity.findOne({
      where: { id },
    });

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

    const entityManager = getManager();

    const rawApplication = await entityManager.query(
      `select * from (
        select a.*, 'ecoverse' as parent, ecoverseId as parentId from application a
        inner join ecoverse_application on a.id=applicationId
        union all
        select a.*, 'challenge' as parent, challengeId as parentId from application a
        inner join challenge_application on a.id=applicationId
        union all
        select a.*, 'opportunity' as parent, opportunityId as parentId from application a
        inner join opportunity_application on a.id=applicationId) as app
        where app.id = ?;`,
      [id]
    );

    const { parent, parentId } = rawApplication[0] as {
      parent: 'ecoverse' | 'challenge' | 'opportunity';
      parentId: number;
    };

    if (parent === 'ecoverse') {
      await this.ecoverseService.addMember(application.user.id);
    } else if (parent === 'challenge') {
      await this.challengeService.addMember(application.user.id, parentId);
    } else if (parent === 'opportunity') {
      await this.opportunityService.addMember(application.user.id, parentId);
    }

    application.status = ApplicationStatus.approved;

    await this.applicationReposity.save(application);

    return application;
  }
}
