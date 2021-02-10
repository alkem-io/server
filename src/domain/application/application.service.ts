import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Application,
  ApplicationStatus,
} from '@domain/application/application.entity';
import { Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ApplicationInput } from '@domain/application/application.dto';
import { NVP } from '@domain/nvp/nvp.entity';
import { UserService } from '@domain/user/user.service';
import { User } from '@domain/user/user.entity';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectRepository(Application)
    private applicationReposity: Repository<Application>,
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
}
