import { ApplicationInput } from '@domain/application/application.dto';
import {
  Application,
  ApplicationStatus,
} from '@domain/application/application.entity';
import { NVP } from '@domain/nvp/nvp.entity';
import { User } from '@domain/user/user.entity';
import { UserService } from '@domain/user/user.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class ApplicationFactoryService {
  constructor(
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
      const nvp = new NVP(x.name, x.value);
      return nvp;
    });

    return application;
  }
}
