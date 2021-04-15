import { CreateApplicationInput } from '@domain/community/application';
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
import { LifecycleActionType } from '@common/enums/lifecycle.action.type';

@Injectable()
export class ApplicationFactoryService {
  constructor(private userService: UserService) {}

  async createApplication(
    applicationData: CreateApplicationInput
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
      LifecycleActionType.APPLICATION
    );

    application.questions = questions.map(x => {
      const nvp = new NVP(x.name, x.value);
      return nvp;
    });

    return application;
  }
}
