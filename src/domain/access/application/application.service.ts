import { LogContext } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import {
  Application,
  CreateApplicationInput,
  DeleteApplicationInput,
  IApplication,
} from '@domain/access/application';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { NVPService } from '@domain/common/nvp/nvp.service';
import { IQuestion } from '@domain/common/question/question.interface';
import { UserService } from '@domain/community/user/user.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IContributor } from '../../community/contributor/contributor.interface';
import { RoleSetCacheService } from '../role-set/role.set.service.cache';
import { applications } from './application.schema';
import { ApplicationLifecycleService } from './application.service.lifecycle';

@Injectable()
export class ApplicationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private userService: UserService,
    private lifecycleService: LifecycleService,
    private applicationLifecycleService: ApplicationLifecycleService,
    private nvpService: NVPService,
    private roleSetCacheService: RoleSetCacheService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createApplication(
    applicationData: CreateApplicationInput
  ): Promise<IApplication> {
    const application: IApplication = Application.create(applicationData as unknown as Partial<Application>);
    application.user = await this.userService.getUserOrFail(
      applicationData.userID
    );

    application.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.APPLICATION
    );
    // save the entity to get the id assigned
    const saved = await this.save(application);

    saved.lifecycle = await this.lifecycleService.createLifecycle();

    return await this.save(saved);
  }

  async deleteApplication(
    deleteData: DeleteApplicationInput
  ): Promise<IApplication> {
    const applicationID = deleteData.ID;
    const application = await this.getApplicationOrFail(applicationID, {
      with: { roleSet: true, user: true },
    });
    if (application.questions) {
      for (const question of application.questions) {
        await this.nvpService.removeNVP(question.id);
      }
    }

    await this.lifecycleService.deleteLifecycle(application.lifecycle.id);
    if (application.authorization)
      await this.authorizationPolicyService.delete(application.authorization);

    await this.db
      .delete(applications)
      .where(eq(applications.id, applicationID));

    if (application.user?.id && application.roleSet?.id) {
      await this.roleSetCacheService.deleteOpenApplicationFromCache(
        application.user?.id,
        application.roleSet?.id
      );
    }

    return application;
  }

  async getApplicationOrFail(
    applicationId: string,
    options?: { with?: Record<string, boolean | object> }
  ): Promise<Application | never> {
    const application = await this.db.query.applications.findFirst({
      where: eq(applications.id, applicationId),
      with: options?.with,
    });
    if (!application)
      throw new EntityNotFoundException(
        `Application with ID ${applicationId} can not be found!`,
        LogContext.COMMUNITY
      );
    return application as unknown as Application;
  }

  async save(application: IApplication): Promise<IApplication> {
    if (application.id) {
      const [updated] = await this.db
        .update(applications)
        .set({
          lifecycleId: application.lifecycle?.id ?? null,
          userId: application.user?.id ?? null,
          roleSetId: application.roleSet?.id ?? null,
          authorizationId: application.authorization?.id ?? null,
        })
        .where(eq(applications.id, application.id))
        .returning();
      return { ...application, ...updated } as unknown as IApplication;
    }
    const [inserted] = await this.db
      .insert(applications)
      .values({
        lifecycleId: application.lifecycle?.id ?? null,
        userId: application.user?.id ?? null,
        roleSetId: application.roleSet?.id ?? null,
        authorizationId: application.authorization?.id ?? null,
      })
      .returning();
    return { ...application, ...inserted } as unknown as IApplication;
  }

  async getContributor(applicationID: string): Promise<IContributor> {
    const application = await this.getApplicationOrFail(applicationID, {
      with: { user: true },
    });
    const user = application.user;
    if (!user)
      throw new RelationshipNotFoundException(
        `Unable to load Contributor for Application ${applicationID} `,
        LogContext.COMMUNITY
      );
    return user;
  }

  async findExistingApplications(
    userID: string,
    roleSetID: string
  ): Promise<IApplication[]> {
    const existingApplications = await this.db.query.applications.findMany({
      where: and(
        eq(applications.userId, userID),
        eq(applications.roleSetId, roleSetID)
      ),
      with: {
        roleSet: true,
        user: true,
      },
    });
    if (existingApplications.length > 0) return existingApplications as unknown as IApplication[];
    return [];
  }

  public async findApplicationsForUser(
    userID: string,
    states: string[] = []
  ): Promise<IApplication[]> {
    const withRelations: Record<string, boolean> = { roleSet: true };

    if (states.length) {
      withRelations.lifecycle = true;
    }

    const result = await this.db.query.applications.findMany({
      where: eq(applications.userId, userID),
      with: withRelations as any,
    });

    const typedResult = result as unknown as IApplication[];

    if (states.length) {
      const filteredApplications = typedResult.filter(app =>
        states.includes(
          this.applicationLifecycleService.getState(app.lifecycle)
        )
      );
      return filteredApplications;
    }

    return typedResult;
  }

  async getLifecycleState(applicationID: string): Promise<string> {
    const invitation = await this.getApplicationOrFail(applicationID);
    const lifecycle = invitation.lifecycle;

    return this.applicationLifecycleService.getState(lifecycle);
  }

  async isFinalizedApplication(applicationID: string): Promise<boolean> {
    const application = await this.getApplicationOrFail(applicationID);

    return this.applicationLifecycleService.isFinalState(application.lifecycle);
  }

  /** Synchronous check when the entity (with eager lifecycle) is already loaded. */
  isApplicationFinalized(application: IApplication): boolean {
    return this.applicationLifecycleService.isFinalState(application.lifecycle);
  }

  async getQuestionsSorted(application: IApplication): Promise<IQuestion[]> {
    const questions = application.questions;
    if (!questions) {
      throw new RelationshipNotFoundException(
        `Unable to load Questions for Application ${application.id} `,
        LogContext.COMMUNITY
      );
    }
    // Sort according to order
    const sortedQuestions = questions.sort((a, b) =>
      a.sortOrder > b.sortOrder ? 1 : -1
    );
    return sortedQuestions;
  }
}
