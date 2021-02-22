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

  async getApplications() {
    return (await this.applicationReposity.find()) || [];
  }

  async getApplication(id: number) {
    return await this.applicationReposity.findOne(id);
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
