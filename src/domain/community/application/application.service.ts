import { CreateApplicationInput } from '@domain/community/application';
import {
  Application,
  IApplication,
  DeleteApplicationInput,
} from '@domain/community/application';

import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { NVPService } from '@domain/common/nvp/nvp.service';
import { UserService } from '@domain/community/user/user.service';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { applicationLifecycleConfig } from '@domain/community/application/application.lifecycle.config';
import { AuthorizationDefinition } from '@domain/common/authorization-definition';
import { AuthorizationDefinitionService } from '@domain/common/authorization-definition/authorization.definition.service';
import { IUser } from '@domain/community/user/user.interface';

@Injectable()
export class ApplicationService {
  constructor(
    private authorizationDefinitionService: AuthorizationDefinitionService,
    @InjectRepository(Application)
    private applicationRepository: Repository<Application>,
    private lifecycleService: LifecycleService,
    private userService: UserService,
    private nvpService: NVPService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createApplication(
    applicationData: CreateApplicationInput,
    ecoverseID = ''
  ): Promise<IApplication> {
    const application: IApplication = Application.create(applicationData);
    application.ecoverseID = ecoverseID;
    application.user = await this.userService.getUserOrFail(
      applicationData.userID
    );

    application.authorization = new AuthorizationDefinition();
    // save the user to get the id assigned
    await this.applicationRepository.save(application);

    application.lifecycle = await this.lifecycleService.createLifecycle(
      application.id,
      applicationLifecycleConfig
    );

    return await this.applicationRepository.save(application);
  }

  async deleteApplication(
    deleteData: DeleteApplicationInput
  ): Promise<IApplication> {
    const applicationID = deleteData.ID;
    const application = await this.getApplicationOrFail(applicationID);
    if (application.questions) {
      for (const question of application.questions) {
        await this.nvpService.removeNVP(question.id);
      }
    }
    if (application.authorization)
      await this.authorizationDefinitionService.delete(
        application.authorization
      );

    const result = await this.applicationRepository.remove(
      application as Application
    );
    result.id = applicationID;
    return result;
  }

  async getApplications() {
    return (await this.applicationRepository.find()) || [];
  }

  async getApplicationOrFail(
    applicationId: string,
    options?: FindOneOptions<Application>
  ): Promise<IApplication> {
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

  async save(application: IApplication): Promise<IApplication> {
    return await this.applicationRepository.save(application);
  }

  async getUser(applicationID: string): Promise<IUser> {
    const application = await this.getApplicationOrFail(applicationID, {
      relations: ['user'],
    });
    const user = application.user;
    if (!user)
      throw new RelationshipNotFoundException(
        `Unable to load User for Application ${applicationID} `,
        LogContext.COMMUNITY
      );
    return user;
  }
}
