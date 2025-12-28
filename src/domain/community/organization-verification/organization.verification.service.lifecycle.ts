import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { OrganizationVerificationEnum } from '@common/enums/organization.verification';
import { InvalidStateTransitionException } from '@common/exceptions/invalid.state.tranistion.exception';
import { ActorContext } from '@core/actor-context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { ILifecycle } from '@domain/common/lifecycle';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AnyStateMachine, setup } from 'xstate';

@Injectable()
export class OrganizationVerificationLifecycleService {
  private readonly organizationVerificationMachine: AnyStateMachine;

  constructor(
    private authorizationService: AuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private lifecycleService: LifecycleService
  ) {
    this.organizationVerificationMachine =
      this.getOrganizationVerificationMachineSetup();
  }

  public getState(lifecycle: ILifecycle): string {
    return this.lifecycleService.getState(
      lifecycle,
      this.organizationVerificationMachine
    );
  }

  public getNextEvents(lifecycle: ILifecycle): string[] {
    return this.lifecycleService.getNextEvents(
      lifecycle,
      this.organizationVerificationMachine
    );
  }

  public isFinalState(lifecycle: ILifecycle): boolean {
    return this.lifecycleService.isFinalState(
      lifecycle,
      this.organizationVerificationMachine
    );
  }

  public getOrganizationVerificationMachine(): AnyStateMachine {
    return this.organizationVerificationMachine;
  }

  private getOrganizationVerificationMachineSetup(): AnyStateMachine {
    const machine = setup({
      actions: {},
      guards: {
        // To actually assign the verified status the GRANT privilege is needed on the verification
        hasGrantPrivilege: ({ event }) => {
          const actorContext: ActorContext = event.actorContext;
          const authorizationPolicy: IAuthorizationPolicy = event.authorization;
          return this.authorizationService.isAccessGranted(
            actorContext,
            authorizationPolicy,
            AuthorizationPrivilege.GRANT
          );
        },
        hasUpdatePrivilege: ({ event }) => {
          const actorContext: ActorContext = event.actorContext;
          const authorizationPolicy: IAuthorizationPolicy = event.authorization;
          return this.authorizationService.isAccessGranted(
            actorContext,
            authorizationPolicy,
            AuthorizationPrivilege.UPDATE
          );
        },
      },
    }).createMachine({
      context: {
        actionsCompleted: true,
      },
      initial: OrganizationVerificationLifecycleState.NOT_VERIFIED,
      states: {
        notVerified: {
          on: {
            VERIFICATION_REQUEST: {
              target:
                OrganizationVerificationLifecycleState.VERIFICATION_PENDING,
              guard: {
                type: 'hasUpdatePrivilege',
              },
            },
          },
        },
        verificationPending: {
          on: {
            MANUALLY_VERIFY: {
              target: OrganizationVerificationLifecycleState.MANUALLY_VERIFIED,
              guard: 'hasGrantPrivilege',
            },
            REJECT: OrganizationVerificationLifecycleState.REJECTED,
          },
        },
        manuallyVerified: {
          entry: [],
          on: {
            RESET: {
              target: OrganizationVerificationLifecycleState.NOT_VERIFIED,
              guard: 'hasGrantPrivilege',
            },
          },
        },
        rejected: {
          on: {
            REOPEN: {
              target: OrganizationVerificationLifecycleState.NOT_VERIFIED,
              guard: 'hasGrantPrivilege',
            },
            ARCHIVE: {
              target: OrganizationVerificationLifecycleState.ARCHIVED,
              guard: 'hasGrantPrivilege',
            },
          },
        },
        archived: {
          type: 'final',
        },
      },
    });

    return machine;
  }

  public getOrganizationVerificationState(
    lifecycle: ILifecycle
  ): OrganizationVerificationEnum {
    const state = this.lifecycleService.getState(
      lifecycle,
      this.organizationVerificationMachine
    );

    switch (state) {
      case OrganizationVerificationLifecycleState.NOT_VERIFIED:
      case OrganizationVerificationLifecycleState.VERIFICATION_PENDING:
      case OrganizationVerificationLifecycleState.REJECTED:
      case OrganizationVerificationLifecycleState.ARCHIVED:
        return OrganizationVerificationEnum.NOT_VERIFIED;
      case OrganizationVerificationLifecycleState.MANUALLY_VERIFIED:
        return OrganizationVerificationEnum.VERIFIED_MANUAL_ATTESTATION;
      default:
        throw new InvalidStateTransitionException(
          `Organization Verification unrecognized state: ${state}`,
          LogContext.COMMUNITY
        );
    }
  }
}

export enum OrganizationVerificationLifecycleState {
  NOT_VERIFIED = 'notVerified',
  VERIFICATION_PENDING = 'verificationPending',
  MANUALLY_VERIFIED = 'manuallyVerified',
  ARCHIVED = 'archived',
  REJECTED = 'rejected',
}
