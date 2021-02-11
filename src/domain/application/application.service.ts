import { ApplicationInput } from '@domain/application/application.dto';
import {
  Application,
  ApplicationStatus,
} from '@domain/application/application.entity';
import { Challenge } from '@domain/challenge/challenge.entity';
import { Ecoverse } from '@domain/ecoverse/ecoverse.entity';
import { NVP } from '@domain/nvp/nvp.entity';
import { Opportunity } from '@domain/opportunity/opportunity.entity';
import { User } from '@domain/user/user.entity';
import { UserService } from '@domain/user/user.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectRepository(Application)
    private applicationReposity: Repository<Application>,
    @InjectRepository(Ecoverse)
    private ecoverseRepository: Repository<Ecoverse>,
    @InjectRepository(Challenge)
    private challengeReposity: Repository<Challenge>,
    @InjectRepository(Opportunity)
    private opportunityReposity: Repository<Opportunity>,
    private userService: UserService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createApplication(
    applicationData: ApplicationInput
  ): Promise<Application> {
    const { questions } = applicationData;

    const application = new Application();
    const user = await this.userService.getUserOrFail(
      applicationData.userId.toString()
    );
    application.user = user as User;
    application.status = ApplicationStatus.new;
    application.questions = questions.map(x => {
      const nvp = new NVP();
      nvp.name = x.name;
      nvp.value = x.value;
      return nvp;
    });

    return await this.applicationReposity.save(application);
  }

  async getForEcoverse(ecoverse: Ecoverse) {
    return this.getForEcoverseById(ecoverse.id);
  }

  async getForEcoverseById(ecoverseId: number) {
    const ecoverse = await this.ecoverseRepository.findOne(
      {
        id: ecoverseId,
      },
      {
        relations: ['applications'],
      }
    );
    return ecoverse?.applications || [];
  }

  async getForChallenge(challenge: Challenge) {
    return this.getForChallengeById(challenge.id);
  }

  async getForChallengeById(challengeId: number) {
    const challenge = await this.challengeReposity.findOne(
      {
        id: challengeId,
      },
      {
        relations: ['applications'],
      }
    );
    return challenge?.applications || [];
  }

  async getForOpportunity(opportunity: Opportunity) {
    return this.getForOpportunityById(opportunity.id);
  }

  async getForOpportunityById(opportunityId: number) {
    const opportunity = await this.opportunityReposity.findOne(
      {
        id: opportunityId,
      },
      {
        relations: ['applications'],
      }
    );
    return opportunity?.applications || [];
  }

  async getApplications() {
    return (await this.applicationReposity.find()) || [];
  }

  async getApplication(id: number) {
    return await this.applicationReposity.findOne(id);
  }
}
