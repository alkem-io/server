import { ApplicationService } from '@domain/community/application/application.service';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { fromEventPattern } from 'rxjs';
import { map } from 'rxjs/operators';
import { EventObject, interpret, MachineOptions, State, Machine } from 'xstate';
import { CommunityService } from '../../community/community.service';
import { ApplicationLifecycleEvent } from './application.lifecycle.events';
import { communityLifecycleMachineConfig } from './application.lifecycle.machine.config';
import {
  ApplicationLifecycleContext,
  ApplicationLifecycleSchema,
} from './application.lifecycle.schema';

@Injectable()
export class ApplicationLifecycleMachineService {
  constructor(
    @Inject(forwardRef(() => CommunityService))
    private communityService: CommunityService,
    private applicationService: ApplicationService // private communityService: CommunityService
  ) {}

  applicationLifecycleMachineOptions: Partial<
    MachineOptions<ApplicationLifecycleContext, ApplicationLifecycleEvent>
  > = {
    actions: {
      //communityAddMember: assign<CommunityLifecycleContext, CommunityLifecycleEvent>((_, event: ApproveApplication) => ({
      communityAddMember: async (_, event: any) => {
        const application = await this.applicationService.getApplicationOrFail(
          event.applicationID,
          {
            relations: ['community'],
          }
        );
        const userID = application.user.id as number;
        const communityID = application.community?.id as number;

        await this.communityService.assignMember({
          userID: userID,
          communityID: communityID,
        });
      },
    },
  };

  private _applicationLifecycleMachine = Machine<
    ApplicationLifecycleContext,
    ApplicationLifecycleSchema,
    ApplicationLifecycleEvent
  >(communityLifecycleMachineConfig).withConfig(
    this.applicationLifecycleMachineOptions
  );
  private service = interpret(this._applicationLifecycleMachine, {
    devTools: true,
  }).start();

  applicationState$ = fromEventPattern<
    [State<ApplicationLifecycleContext, ApplicationLifecycleEvent>, EventObject]
  >(
    handler => {
      return this.service.onTransition(handler);
    },
    (_, service) => service.stop()
  ).pipe(map(([state, _]) => state));

  send(event: ApplicationLifecycleEvent) {
    this.service.send(event);
  }
}
