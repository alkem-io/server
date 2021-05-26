import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MachineOptions } from 'xstate';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { ProjectEventInput, IProject } from '@domain/collaboration/project';
import { ProjectService } from './project.service';

@Injectable()
export class ProjectLifecycleOptionsProvider {
  constructor(
    private lifecycleService: LifecycleService,
    private projectService: ProjectService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async eventOnProject(projectEventData: ProjectEventInput): Promise<IProject> {
    const projectID = projectEventData.ID;
    const lifecycle = await this.projectService.getLifecycle(projectID);

    // Send the event, translated if needed
    this.logger.verbose?.(
      `Event ${projectEventData.eventName} triggered on Project: ${projectID} using lifecycle ${lifecycle.id}`,
      LogContext.COMMUNITY
    );
    await this.lifecycleService.event(
      {
        ID: lifecycle.id,
        eventName: projectEventData.eventName,
      },
      this.ProjectLifecycleMachineOptions
    );

    return await this.projectService.getProjectOrFail(projectID);
  }

  private ProjectLifecycleMachineOptions: Partial<MachineOptions<any, any>> = {
    actions: {
      sampleEvent: async (_, event: any) => {
        const Project = await this.projectService.getProjectOrFail(
          event.parentID
        );
        this.logger.verbose?.(
          `Command triggered on Project: ${Project.id}`,
          LogContext.CHALLENGES
        );
      },
    },
  };
}
