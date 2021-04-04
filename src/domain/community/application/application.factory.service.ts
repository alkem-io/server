import { ApplicationInput } from '@domain/community/application/application.dto';
import {
  Application,
  ApplicationStatus,
} from '@domain/community/application/application.entity';
import { NVP } from '@domain/common/nvp/nvp.entity';
import { User } from '@domain/community/user/user.entity';
import { UserService } from '@domain/community/user/user.service';
import { Injectable } from '@nestjs/common';
import { Lifecycle } from '@domain/common/lifecycle/lifecycle.entity';
import { applicationLifecycle } from './application.lifecycle';
import { LifecycleActionsTypes } from '@common/enums/lifecycle.actions.types';

@Injectable()
export class ApplicationFactoryService {
  constructor(private userService: UserService) {}

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

    application.lifecycle = new Lifecycle(
      JSON.stringify(applicationLifecycle),
      LifecycleActionsTypes.APPLICATION
    );

    application.questions = questions.map(x => {
      const nvp = new NVP(x.name, x.value);
      return nvp;
    });

    return application;
  }
}
