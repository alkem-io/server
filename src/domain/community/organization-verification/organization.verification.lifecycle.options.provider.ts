import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { EntityNotInitializedException } from '@common/exceptions';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { OrganizationVerificationEventInput } from './dto/organization.verification.dto.event';
import { OrganizationVerificationService } from './organization.verification.service';
import { IOrganizationVerification } from './organization.verification.interface';

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
    const organizationVerification =
      await this.organizationVerificationService.getOrganizationVerificationOrFail(
        organizationVerificationEventData.organizationVerificationID
      );

    if (!organizationVerification.lifecycle)
      throw new EntityNotInitializedException(
        `Verification Lifecycle not initialized on Organization: ${organizationVerification.id}`,
        LogContext.COMMUNITY
      );

    // Send the event, translated if needed
    this.logger.verbose?.(
      `Event ${organizationVerificationEventData.eventName} triggered on organization: ${organizationVerification.id} using lifecycle ${organizationVerification.lifecycle.id}`,
      LogContext.COMMUNITY
    );
    await this.lifecycleService.event({
      ID: organizationVerification.lifecycle.id,
      eventName: organizationVerificationEventData.eventName,
      actions: this.organizationVerificationLifecycleMachineOptions.actions,
      guards: this.organizationVerificationLifecycleMachineOptions.guards,
      agentInfo,
      authorization: organizationVerification.authorization,
    });

    return await this.organizationVerificationService.getOrganizationVerificationOrFail(
      organizationVerification.id
    );
  }

  private organizationVerificationLifecycleMachineOptions: any = {
    actions: {
      organizationManuallyVerified: (_: { id: any }, __: any) => {
        throw new Error('Error crashing the server');
        // Rely on state being synchronized in the containing handler
      },
    },
    guards: {
      // To actually assign the verified status the GRANT privilege is needed on the verification
      organizationVerificationGrantAuthorized: (
        _: any,
        event: { agentInfo: AgentInfo; authorization: IAuthorizationPolicy }
      ) => {
        const agentInfo: AgentInfo = event.agentInfo;
        const authorizationPolicy: IAuthorizationPolicy = event.authorization;
        return this.authorizationService.isAccessGranted(
          agentInfo,
          authorizationPolicy,
          AuthorizationPrivilege.GRANT
        );
      },
      organizationVerificationUpdateAuthorized: (
        _: any,
        event: { agentInfo: AgentInfo; authorization: IAuthorizationPolicy }
      ) => {
        const agentInfo: AgentInfo = event.agentInfo;
        const authorizationPolicy: IAuthorizationPolicy = event.authorization;
        return this.authorizationService.isAccessGranted(
          agentInfo,
          authorizationPolicy,
          AuthorizationPrivilege.UPDATE
        );
      },
    },
  };
}
