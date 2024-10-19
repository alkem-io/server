import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { InvalidStateTransitionException } from '@common/exceptions';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { OrganizationVerificationEventInput } from './dto/organization.verification.dto.event';
import { OrganizationVerificationService } from './organization.verification.service';
import { IOrganizationVerification } from './organization.verification.interface';
import { OrganizationVerificationEnum } from '@common/enums/organization.verification';
import { ILifecycle } from '@domain/common/lifecycle/lifecycle.interface';
import { LifecycleEvent } from '@domain/common/lifecycle/types/lifecycle.event';
import { createMachine } from 'xstate';
import { LifecycleEventInput } from '@domain/common/lifecycle';
import { organizationVerificationLifecycleConfig } from './organization.verification.lifecycle.config';

@Injectable()
export class OrganizationVerificationLifecycleOptionsProvider {
  constructor(
    private lifecycleService: LifecycleService,
    private organizationVerificationService: OrganizationVerificationService,
    private authorizationService: AuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async eventOnOrganizationVerfication(
    organizationVerificationEventData: OrganizationVerificationEventInput,
    agentInfo: AgentInfo
  ): Promise<IOrganizationVerification> {
    let organizationVerification =
      await this.organizationVerificationService.getOrganizationVerificationOrFail(
        organizationVerificationEventData.organizationVerificationID
      );

    // Send the event, translated if needed
    this.logger.verbose?.(
      `Event ${organizationVerificationEventData.eventName} triggered on organization: ${organizationVerification.id} using lifecycle ${organizationVerification.lifecycle.id}`,
      LogContext.COMMUNITY
    );

    const machine = this.getMachine();
    const event: LifecycleEventInput = {
      ID: organizationVerification.lifecycle.id,
      lifecycle: organizationVerification.lifecycle,
      machine,
      eventName: organizationVerificationEventData.eventName,
      agentInfo,
      authorization: organizationVerification.authorization,
      parentID: organizationVerification.id,
    };

    await this.lifecycleService.event(event);

    organizationVerification =
      await this.organizationVerificationService.getOrganizationVerificationOrFail(
        organizationVerification.id
      );

    // Ensure the cached state is synced with the lifecycle state
    organizationVerification.status = this.getOrganizationVerificationState(
      organizationVerification.lifecycle,
      machine
    );
    return await this.organizationVerificationService.save(
      organizationVerification
    );
  }

  public getMachine(): any {
    const machine = createMachine(organizationVerificationLifecycleConfig);
    machine.provide({
      guards: {
        organizationVerificationGrantAuthorized: (_: any, __: any) => {
          console.log('organizationVerificationGrantAuthorized');
          return true;
        },
        // To actually assign the verified status the GRANT privilege is needed on the verification
        organizationVerificationGrantAuthorized2: (_: any, __: any) => {
          const event: LifecycleEvent = _.event;
          const agentInfo: AgentInfo = event.agentInfo;
          const authorizationPolicy: IAuthorizationPolicy = event.authorization;
          return this.authorizationService.isAccessGranted(
            agentInfo,
            authorizationPolicy,
            AuthorizationPrivilege.GRANT
          );
        },
        organizationVerificationUpdateAuthorized: (_: any, __: any) => {
          const event: LifecycleEvent = _.event;
          const agentInfo: AgentInfo = event.agentInfo;
          const authorizationPolicy: IAuthorizationPolicy = event.authorization;
          return this.authorizationService.isAccessGranted(
            agentInfo,
            authorizationPolicy,
            AuthorizationPrivilege.UPDATE
          );
        },
      },
      actions: {
        organizationManuallyVerified: (_: any) => {
          console.log('action organizationManuallyVerified');
          // throw new Error('Action not implemented');
          // Rely on state being synchronized in the containing handler
        },
      },
    });
    return machine;
  }

  private getOrganizationVerificationState(
    lifecycle: ILifecycle,
    machine: any
  ): OrganizationVerificationEnum {
    const state = this.lifecycleService.getState(lifecycle, machine);

    switch (state) {
      case 'notVerified':
      case 'verificationPending':
      case 'rejected':
      case 'archived':
        return OrganizationVerificationEnum.NOT_VERIFIED;
      case 'manuallyVerified':
        return OrganizationVerificationEnum.VERIFIED_MANUAL_ATTESTATION;
      default:
        throw new InvalidStateTransitionException(
          `Organizaiton Verification unrecognized state: ${state}`,
          LogContext.COMMUNITY
        );
    }
  }
}
